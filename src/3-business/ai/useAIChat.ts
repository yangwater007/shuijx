/** 业务层 — AI 对话 Hook（MCP 工具调用 + DeepSeek 流式） */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { streamDeepSeekChat, fetchCailianNews, fetchKaipanla, fetchBoardLadderForContext } from "@data/repository/ai";
import { getDeepSeekToolDefinitions, callMCPTool } from "@data/repository/mcp";
import AIService from "@service/ai/AIService";
import type { ChatMessage, AnalysisFramework, AIModel, NewsItem, KaipanlaItem } from "@infra/types/ai";
import { BUILTIN_FRAMEWORKS } from "@infra/types/ai";
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from "@infra/config";

export default function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState<AIModel>("deepseek-chat");
  const [frameworks, setFrameworks] = useState<AnalysisFramework[]>(BUILTIN_FRAMEWORKS);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [hotStocks, setHotStocks] = useState<KaipanlaItem[]>([]);
  const [mcpTools, setMcpTools] = useState<unknown[]>([]);
  const [mcpReady, setMcpReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const enabledFrameworks = useMemo(
    () => frameworks.filter((f) => f.enabled),
    [frameworks]
  );

  // 初始加载
  useEffect(() => {
    void (async () => {
      const [newsData, hotData] = await Promise.all([
        fetchCailianNews(),
        fetchKaipanla(),
      ]);
      setNews(newsData);
      setHotStocks(hotData);
    })();
    // 加载 MCP 工具定义
    void (async () => {
      try {
        const tools = await getDeepSeekToolDefinitions();
        setMcpTools(tools);
        setMcpReady(true);
      } catch {
        // MCP 不可用时仍可使用纯对话模式
        setMcpReady(false);
      }
    })();
  }, []);

  const toggleFramework = useCallback((id: string) => {
    setFrameworks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  }, []);

  /** 第一步：非流式调用 DeepSeek，检测是否需要工具调用 */
  const checkToolCalls = useCallback(
    async (
      apiMessages: Array<{ role: string; content: string }>,
      signal?: AbortSignal
    ): Promise<{
      finishReason: string;
      content: string | null;
      toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> | null;
    }> => {
      const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          tools: mcpTools.length > 0 ? mcpTools : undefined,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal,
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        throw new Error(`API ${resp.status}: ${errBody.slice(0, 200)}`);
      }

      const json = await resp.json() as {
        choices: Array<{
          finish_reason: string;
          message: {
            content: string | null;
            tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
          };
        }>;
      };

      const choice = json.choices[0];
      if (!choice) throw new Error("无响应");

      return {
        finishReason: choice.finish_reason,
        content: choice.message.content,
        toolCalls: choice.message.tool_calls ?? null,
      };
    },
    [model, mcpTools]
  );

  /** 发送消息 */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg = AIService.createUserMessage(content);
      const assistantMsg = AIService.createAssistantPlaceholder();

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // 获取市场上下文
        const ladderCtx = await fetchBoardLadderForContext();
        const newsCtx = AIService.formatNewsContext(
          news as Array<{ content?: string; brief?: string }>
        );

        const systemPrompt = AIService.buildSystemPrompt(
          enabledFrameworks,
          ladderCtx + newsCtx
        );

        const currentMsgs = [...messages, userMsg];
        const apiMessages = AIService.toAPIMessages(currentMsgs, systemPrompt);

        // 🔧 第一步：检测是否需要工具调用
        const hasTools = mcpReady && mcpTools.length > 0;
        if (hasTools) {
          const checkResult = await checkToolCalls(apiMessages, controller.signal);

          if (checkResult.toolCalls && checkResult.toolCalls.length > 0) {
            // 有工具调用：创建工具调用消息
            const toolCallsWithType = checkResult.toolCalls.map(tc => ({ ...tc, type: "function" as const }));
const toolCallMsg = AIService.createToolCallMessage(toolCallsWithType);
            
            // 更新消息列表：替换 AI 占位为工具调用消息
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...toolCallMsg,
                isToolRunning: true,
              };
              return updated;
            });

            // 执行工具调用
            const toolResults: ChatMessage[] = [];
            for (const tc of checkResult.toolCalls) {
              try {
                const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
                const result = await callMCPTool(tc.function.name, args);
                toolResults.push(
                  AIService.createToolResultMessage(tc.id, tc.function.name, result.content)
                );
              } catch (err) {
                toolResults.push(
                  AIService.createToolResultMessage(
                    tc.id,
                    tc.function.name,
                    `工具调用失败: ${err instanceof Error ? err.message : String(err)}`
                  )
                );
              }
            }

            // 刷新消息列表，追加工具结果
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.isToolRunning) {
                updated[updated.length - 1] = { ...last, isToolRunning: false };
              }
              return [...updated, ...toolResults];
            });

            // 🔧 第二步：流式调用 DeepSeek 获取最终回答
            const finalAssistantMsg = AIService.createAssistantPlaceholder();
            setMessages((prev) => [...prev, finalAssistantMsg]);

            const allMsgs = [...currentMsgs, toolCallMsg, ...toolResults];
            const finalApiMessages = AIService.toAPIMessages(allMsgs, systemPrompt);

            let fullContent = "";
            await streamDeepSeekChat(finalApiMessages, {
                onToken: (token) => {
                  fullContent += token;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant" && last.isStreaming) {
                      updated[updated.length - 1] = { ...last, content: fullContent };
                    }
                    return updated;
                  });
                },
                onDone: () => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        isStreaming: false,
                        timestamp: Date.now(), } as ChatMessage;
                    }
                    return updated;
                  });
                  setIsStreaming(false);
                },
                onError: (err) => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: `错误: ${err.message}`,
                        isStreaming: false,
                        isError: true,
                        timestamp: Date.now(), } as ChatMessage;
                    }
                    return updated;
                  });
                  setIsStreaming(false);
                },
              },
              controller.signal);
            return;
          }

          // 有文本内容：直接显示（如简单问候）
          if (checkResult.content) {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: checkResult.content ?? "",
                isStreaming: false,
                timestamp: Date.now(), } as ChatMessage;
              return updated;
            });
            setIsStreaming(false);
            return;
          }
        }

        // 🔧 无工具调用或 MCP 不可用：直接流式对话
        let fullContent = "";
        await streamDeepSeekChat(
          apiMessages,
          {
            onToken: (token) => {
              fullContent += token;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant" && last.isStreaming) {
                  updated[updated.length - 1] = { ...last, content: fullContent };
                }
                return updated;
              });
            },
            onDone: () => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    isStreaming: false,
                    timestamp: Date.now(), } as ChatMessage;
                }
                return updated;
              });
              setIsStreaming(false);
            },
            onError: (err) => {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: `错误: ${err.message}`,
                    isStreaming: false,
                    isError: true,
                    timestamp: Date.now(), } as ChatMessage;
                }
                return updated;
              });
              setIsStreaming(false);
            },
          },
          controller.signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: `错误: ${err instanceof Error ? err.message : String(err)}`,
              isStreaming: false,
              isError: true,
              timestamp: Date.now(), } as ChatMessage;
          }
          return updated;
        });
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, model, enabledFrameworks, news, mcpReady, mcpTools, checkToolCalls]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === "assistant" && last.isStreaming) {
        updated[updated.length - 1] = { ...last, isStreaming: false, isInterrupted: true };
      }
      return updated;
    });
  }, []);

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    model,
    setModel,
    frameworks,
    enabledFrameworks,
    toggleFramework,
    news,
    hotStocks,
    mcpReady,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}