/**
 * 业务层 — AI 对话 Hook（MCP函数调用 + Thinking + 流式分析）
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { streamDeepSeekChat, executeToolCall, MCP_FUNCTIONS, fetchCailianNews, fetchKaipanla, fetchBoardLadderForContext } from "@data/repository/ai";
import AIService from "@service/ai/AIService";
import type { ChatMessage, AnalysisFramework, AIModel, NewsItem, KaipanlaItem } from "@infra/types/ai";
import { BUILTIN_FRAMEWORKS } from "@infra/types/ai";
import type { FunctionDef } from "@data/repository/mcp";

// 模型配置（持久化到 localStorage）
interface ModelConfig {
  provider: "deepseek" | "custom";
  apiKey: string;
  baseURL: string;
  temperature: number;
  thinkingEnabled: boolean;
  mcpEnabled: boolean;
}

function loadModelConfig(): ModelConfig {
  try {
    const saved = localStorage.getItem("ai_model_config");
    if (saved) return { ...getDefaultConfig(), ...JSON.parse(saved) as Partial<ModelConfig> };
  } catch { /* ignore */ }
  return getDefaultConfig();
}

function getDefaultConfig(): ModelConfig {
  return {
    provider: "deepseek",
    apiKey: "",
    baseURL: "https://api.deepseek.com/v1",
    temperature: 0.7,
    thinkingEnabled: false,
    mcpEnabled: true,
  };
}

export default function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState<AIModel>("deepseek-chat");
  const [frameworks, setFrameworks] = useState<AnalysisFramework[]>(BUILTIN_FRAMEWORKS);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [hotStocks, setHotStocks] = useState<KaipanlaItem[]>([]);
  const [config, setConfig] = useState<ModelConfig>(loadModelConfig);
  const [thinkingText, setThinkingText] = useState("");
  const [toolCallStatus, setToolCallStatus] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const enabledFrameworks = useMemo(() => frameworks.filter((f) => f.enabled), [frameworks]);

  // 持久化配置
  const saveConfig = useCallback((patch: Partial<ModelConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem("ai_model_config", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // 初始化
  useEffect(() => {
    void (async () => {
      const [nd, hd] = await Promise.all([fetchCailianNews(), fetchKaipanla()]);
      setNews(nd); setHotStocks(hd);
    })();
  }, []);

  const toggleFramework = useCallback((id: string) => {
    setFrameworks((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }, []);

  // ─── 核心：带函数调用的流式对话 ─────────────────

  const executeChatTurn = useCallback(async (
    apiMessages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>,
    signal: AbortSignal,
    modelName: string,
    functions: FunctionDef[] | undefined,
  ): Promise<{ content: string; toolCalls: Array<{ name: string; arguments: string }> }> => {
    return new Promise((resolve, reject) => {
      let fullContent = "";
      let fullThinking = "";
      const toolCalls: Array<{ name: string; arguments: string }> = [];

      streamDeepSeekChat(
        apiMessages,
        {
          onToken: (token) => {
            fullContent += token;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                updated[updated.length - 1] = { ...last, content: fullContent, thinking: fullThinking || undefined };
              }
              return updated;
            });
          },
          onReasoning: (token) => {
            fullThinking += token;
            setThinkingText(fullThinking);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                updated[updated.length - 1] = { ...last, content: fullContent, thinking: fullThinking || undefined };
              }
              return updated;
            });
          },
          onFunctionCall: (call) => {
            toolCalls.push(call);
            setToolCallStatus("调用: " + call.name + "...");
          },
          onDone: () => resolve({ content: fullContent, toolCalls }),
          onError: (err) => reject(err),
        },
        signal,
        modelName,
        functions,
        { temperature: config.temperature },
      );
    });
  }, [config.temperature]);

  // ─── 发送消息主流程 ──────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMsg = AIService.createUserMessage(content);
    const assistantMsg = AIService.createAssistantPlaceholder();
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    setThinkingText("");
    setToolCallStatus("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 1. 静态数据上下文
      const marketCtx = await fetchBoardLadderForContext();
      const newsCtx = AIService.formatNewsContext(news as Array<{ content?: string; brief?: string }>);

      const systemPrompt = AIService.buildSystemPrompt(enabledFrameworks, marketCtx + newsCtx);
      const currentMsgs = [...messages, userMsg];

      // 2. 构建API消息列表
      let apiMessages = AIService.toAPIMessages(currentMsgs, systemPrompt);

      // 3. MCP工具集
      const functions = config.mcpEnabled ? MCP_FUNCTIONS : undefined;

      // 4. 工具调用循环（最多5轮）
      const MAX_ROUNDS = 5;
      let round = 0;

      while (round < MAX_ROUNDS) {
        round++;
        const result = await executeChatTurn(apiMessages, controller.signal, model, functions);

        // AI 返回了工具调用
        if (result.toolCalls.length > 0) {
          setToolCallStatus("执行工具... (" + round + "/" + MAX_ROUNDS + ")");

          // 添加 AI 的 tool_calls 消息
          const toolCallMsg: ChatMessage = {
            id: AIService.generateMessageId(),
            role: "assistant",
            content: result.content || "",
            toolCalls: result.toolCalls.map((tc) => ({
              id: "call_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
              name: tc.name,
              arguments: tc.arguments,
            })),
            timestamp: Date.now(),
          };

          // 执行工具并添加结果
          const toolResults: ChatMessage[] = [];
          for (const tc of result.toolCalls) {
            const toolResult = await executeToolCall(tc.name, tc.arguments);
            setToolCallStatus(tc.name + " 完成");
            toolResults.push({
              id: AIService.generateMessageId(),
              role: "tool",
              content: toolResult.slice(0, 3000),
              toolCallId: "call_" + Date.now(),
              toolName: tc.name,
              timestamp: Date.now(),
            });
          }

          // 更新消息列表（替换当前的 assistant 占位符为工具调用消息）
          setMessages((prev) => {
            const updated = [...prev];
            // 移除最后的占位符
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && last.isStreaming) {
              updated.pop();
            }
            // 添加工具调用消息和结果
            updated.push(toolCallMsg, ...toolResults);
            // 添加新的占位符
            updated.push(AIService.createAssistantPlaceholder());
            return updated;
          });

          // 更新 API 消息列表（用于下一轮）
          apiMessages.push(
            { role: "assistant", content: result.content || "", tool_calls: toolCallMsg.toolCalls?.map((tc) => ({
              id: tc.id, type: "function", function: { name: tc.name, arguments: tc.arguments },
            })) },
            ...toolResults.map((tr) => ({
              role: "tool" as const,
              content: tr.content,
              tool_call_id: tr.toolCallId ?? "",
            })),
          );
          continue; // 继续下一轮
        }

        // AI 返回了最终文本（无工具调用）
        setToolCallStatus("");
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && last.isStreaming) {
            updated[updated.length - 1] = { ...last, content: result.content, isStreaming: false, timestamp: Date.now() };
          }
          return updated;
        });
        break;
      }

      setIsStreaming(false);
      abortRef.current = null;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: "错误: " + (err instanceof Error ? err.message : String(err)), isStreaming: false, isError: true, timestamp: Date.now() };
        }
        return updated;
      });
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages, isStreaming, model, enabledFrameworks, news, config, executeChatTurn]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant" && last.isStreaming) {
        updated[updated.length - 1] = { ...last, isStreaming: false, isInterrupted: true };
      }
      return updated;
    });
  }, []);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]); setIsStreaming(false); setThinkingText(""); setToolCallStatus("");
  }, []);

  return {
    messages, isStreaming, model, setModel,
    frameworks, enabledFrameworks, toggleFramework,
    news, hotStocks,
    config, saveConfig,
    thinkingText, toolCallStatus,
    sendMessage, stopStreaming, clearMessages,
  };
}