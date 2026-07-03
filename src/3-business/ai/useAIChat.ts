/** 业务层 — AI 对话 Hook */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { streamDeepSeekChat, fetchCailianNews, fetchKaipanla, fetchBoardLadderForContext } from "@data/repository/ai";
import AIService from "@service/ai/AIService";
import type { ChatMessage, AnalysisFramework, AIModel, NewsItem, KaipanlaItem } from "@infra/types/ai";
import { BUILTIN_FRAMEWORKS } from "@infra/types/ai";

export default function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState<AIModel>("deepseek-chat");
  const [frameworks, setFrameworks] = useState<AnalysisFramework[]>(BUILTIN_FRAMEWORKS);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [hotStocks, setHotStocks] = useState<KaipanlaItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  /** 启用的框架 */
  const enabledFrameworks = useMemo(
    () => frameworks.filter((f) => f.enabled),
    [frameworks]
  );

  /** 初始加载新闻+热榜 */
  useEffect(() => {
    void (async () => {
      const [newsData, hotData] = await Promise.all([
        fetchCailianNews(),
        fetchKaipanla(),
      ]);
      setNews(newsData);
      setHotStocks(hotData);
    })();
  }, []);

  /** 切换框架启用状态 */
  const toggleFramework = useCallback((id: string) => {
    setFrameworks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  }, []);

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

      // 获取市场数据作为上下文
      const ladderCtx = await fetchBoardLadderForContext();
      const newsCtx = AIService.formatNewsContext(news as Array<{ content?: string; brief?: string }>);

      const systemPrompt = AIService.buildSystemPrompt(
        enabledFrameworks,
        ladderCtx + newsCtx
      );

      // 获取当前消息列表（不含刚加的AI占位）
      const currentMsgs = [...messages, userMsg];

      const apiMessages = AIService.toAPIMessages(currentMsgs, systemPrompt);

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
                  timestamp: Date.now(),
                };
              }
              return updated;
            });
            setIsStreaming(false);
            abortRef.current = null;
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
                  timestamp: Date.now(),
                };
              }
              return updated;
            });
            setIsStreaming(false);
            abortRef.current = null;
          },
        },
        controller.signal
      );
    },
    [messages, isStreaming, model, enabledFrameworks, news]
  );

  /** 停止生成 */
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

  /** 清空对话 */
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
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
