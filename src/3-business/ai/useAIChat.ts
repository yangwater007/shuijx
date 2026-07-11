/**
 * 业务层 — AI 对话 Hook（MCP函数调用 + Thinking + 流式分析）
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { streamDeepSeekChat, executeToolCall, MCP_FUNCTIONS, fetchCailianNews, fetchKaipanla, fetchBoardLadderForContext } from "@data/repository/ai";
import AIService from "@service/ai/AIService";
import type { ChatMessage, AnalysisFramework, AIModel, NewsItem, KaipanlaItem } from "@infra/types/ai";
import { BUILTIN_FRAMEWORKS } from "@infra/types/ai";
import type { FunctionDef } from "@data/repository/mcp";

interface ModelConfig {
  provider: "deepseek" | "custom";
  apiKey: string; baseURL: string;
  temperature: number; thinkingEnabled: boolean; mcpEnabled: boolean;
}

function loadModelConfig(): ModelConfig {
  try { const s = localStorage.getItem("ai_model_config"); if (s) return { ...getDefaultConfig(), ...JSON.parse(s) as Partial<ModelConfig> }; } catch { /* */ }
  return getDefaultConfig();
}
function getDefaultConfig(): ModelConfig {
  return { provider: "deepseek", apiKey: "", baseURL: "https://api.deepseek.com/v1", temperature: 0.7, thinkingEnabled: false, mcpEnabled: true };
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

  const saveConfig = useCallback((patch: Partial<ModelConfig>) => {
    setConfig((prev) => { const next = { ...prev, ...patch }; try { localStorage.setItem("ai_model_config", JSON.stringify(next)); } catch { /* */ } return next; });
  }, []);

  useEffect(() => { void (async () => { const [nd, hd] = await Promise.all([fetchCailianNews(), fetchKaipanla()]); setNews(nd); setHotStocks(hd); })(); }, []);
  const toggleFramework = useCallback((id: string) => { setFrameworks((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))); }, []);

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
              const u = [...prev]; const last = u[u.length - 1];
              if (last?.role === "assistant" && last.isStreaming) u[u.length - 1] = { ...last, content: fullContent, thinking: fullThinking || undefined };
              return u;
            });
          },
          onReasoning: (token) => {
            fullThinking += token; setThinkingText(fullThinking);
            setMessages((prev) => {
              const u = [...prev]; const last = u[u.length - 1];
              if (last?.role === "assistant" && last.isStreaming) u[u.length - 1] = { ...last, content: fullContent, thinking: fullThinking || undefined };
              return u;
            });
          },
          onFunctionCall: (call) => { toolCalls.push(call); setToolCallStatus(call.name + "..."); },
          onDone: () => resolve({ content: fullContent, toolCalls }),
          onError: (err) => reject(err),
        },
        signal, modelName, functions,
        { temperature: config.temperature },
      );
    });
  }, [config.temperature]);

  // ─── 发送消息 ──────────────────────────────────

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMsg = AIService.createUserMessage(content);
    const assistantMsg = AIService.createAssistantPlaceholder();
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true); setThinkingText(""); setToolCallStatus("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const marketCtx = await fetchBoardLadderForContext();
      const newsCtx = AIService.formatNewsContext(news as Array<{ content?: string; brief?: string }>);
      const systemPrompt = AIService.buildSystemPrompt(enabledFrameworks, marketCtx + newsCtx);
      const currentMsgs = [...messages, userMsg];
      let apiMessages = AIService.toAPIMessages(currentMsgs, systemPrompt);
      const functions = config.mcpEnabled ? MCP_FUNCTIONS : undefined;

      const MAX_ROUNDS = 5;
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const result = await executeChatTurn(apiMessages, controller.signal, model, functions);

        // 无工具调用 → 完成
        if (result.toolCalls.length === 0) {
          setToolCallStatus("");
          setMessages((prev) => {
            const u = [...prev]; const last = u[u.length - 1];
            if (last?.role === "assistant" && last.isStreaming) u[u.length - 1] = { ...last, content: result.content, isStreaming: false, timestamp: Date.now() };
            return u;
          });
          break;
        }

        // 有工具调用 → 生成唯一 call_id 并执行
        setToolCallStatus("执行工具(" + (round + 1) + "/" + MAX_ROUNDS + ")...");

        const callId = "call_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

        // 构建 assistant message 的 tool_calls（OpenAI 格式，所有调用共享同一个 callId 前缀）
        const openaiToolCalls = result.toolCalls.map((tc, i) => ({
          id: callId + "_" + i,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));

        const toolCallMsgForUI: ChatMessage = {
          id: AIService.generateMessageId(),
          role: "assistant",
          content: result.content || "",
          toolCalls: result.toolCalls.map((tc, i) => ({
            id: openaiToolCalls[i]!.id,
            name: tc.name,
            arguments: tc.arguments,
          })),
          timestamp: Date.now(),
        };

        // 执行每个工具调用
        const toolResultsForUI: ChatMessage[] = [];
        const toolResultsForAPI: Array<{ role: "tool"; content: string; tool_call_id: string }> = [];

        for (let i = 0; i < result.toolCalls.length; i++) {
          const tc = result.toolCalls[i]!;
          const tid = openaiToolCalls[i]!.id;
          const resText = await executeToolCall(tc.name, tc.arguments);
          setToolCallStatus(tc.name + " 完成");

          toolResultsForUI.push({
            id: AIService.generateMessageId(),
            role: "tool",
            content: resText.slice(0, 3000),
            toolCallId: tid,
            toolName: tc.name,
            timestamp: Date.now(),
          });

          toolResultsForAPI.push({
            role: "tool",
            content: resText.slice(0, 3000),
            tool_call_id: tid,
          });
        }

        // 更新 UI 消息列表
        setMessages((prev) => {
          const u = [...prev];
          const last = u[u.length - 1];
          if (last?.role === "assistant" && last.isStreaming) u.pop();
          u.push(toolCallMsgForUI, ...toolResultsForUI, AIService.createAssistantPlaceholder());
          return u;
        });

        // 更新 API 消息列表（用于下一轮循环）
        apiMessages.push(
          { role: "assistant", content: result.content || "", tool_calls: openaiToolCalls },
          ...toolResultsForAPI,
        );
      }

      setIsStreaming(false);
      abortRef.current = null;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setMessages((prev) => {
        const u = [...prev]; const last = u[u.length - 1];
        if (last?.role === "assistant") u[u.length - 1] = { ...last, content: "错误: " + (err instanceof Error ? err.message : String(err)), isStreaming: false, isError: true, timestamp: Date.now() };
        return u;
      });
      setIsStreaming(false); abortRef.current = null;
    }
  }, [messages, isStreaming, model, enabledFrameworks, news, config, executeChatTurn]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort(); setIsStreaming(false);
    setMessages((prev) => { const u = [...prev]; const last = u[u.length - 1]; if (last?.role === "assistant" && last.isStreaming) u[u.length - 1] = { ...last, isStreaming: false, isInterrupted: true }; return u; });
  }, []);

  const clearMessages = useCallback(() => { abortRef.current?.abort(); setMessages([]); setIsStreaming(false); setThinkingText(""); setToolCallStatus(""); }, []);

  return { messages, isStreaming, model, setModel, frameworks, enabledFrameworks, toggleFramework, news, hotStocks, config, saveConfig, thinkingText, toolCallStatus, sendMessage, stopStreaming, clearMessages };
}