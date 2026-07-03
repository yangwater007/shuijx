/** 业务层 — AI 对话 Hook（数据注入 + DeepSeek 流式分析） */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { streamDeepSeekChat, fetchCailianNews, fetchKaipanla, fetchBoardLadderForContext, fetchMarketOverview, fetchHotSectors, fetchStockRank } from "@data/repository/ai";
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

  const enabledFrameworks = useMemo(
    () => frameworks.filter((f) => f.enabled),
    [frameworks]
  );

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

  const toggleFramework = useCallback((id: string) => {
    setFrameworks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  }, []);

  /** 获取实时市场数据上下文 */
  const fetchMarketContext = useCallback(async (): Promise<string> => {
    const results = await Promise.allSettled([
      fetchBoardLadderForContext(),
      fetchMarketOverview(),
      fetchHotSectors(),
      fetchStockRank("gainers", 10),
    ]);

    const parts: string[] = [];
    if (results[0].status === "fulfilled" && results[0].value) parts.push(results[0].value);
    if (results[1].status === "fulfilled" && results[1].value) parts.push(results[1].value);
    if (results[2].status === "fulfilled" && results[2].value) parts.push(results[2].value);
    if (results[3].status === "fulfilled" && results[3].value) parts.push(results[3].value);

    return parts.join("\n\n");
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

      try {
        // 获取最新市场数据
        const marketCtx = await fetchMarketContext();
        const newsCtx = AIService.formatNewsContext(
          news as Array<{ content?: string; brief?: string }>
        );

        const systemPrompt = AIService.buildSystemPrompt(
          enabledFrameworks,
          marketCtx + newsCtx
        );

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
                  updated[updated.length - 1] = { ...last, isStreaming: false, timestamp: Date.now() };
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
                  updated[updated.length - 1] = { ...last, content: `错误: ${err.message}`, isStreaming: false, isError: true, timestamp: Date.now() };
                }
                return updated;
              });
              setIsStreaming(false);
              abortRef.current = null;
            },
          },
          controller.signal,
          model
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: `错误: ${err instanceof Error ? err.message : String(err)}`, isStreaming: false, isError: true, timestamp: Date.now() };
          }
          return updated;
        });
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, model, enabledFrameworks, news, fetchMarketContext]
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
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}