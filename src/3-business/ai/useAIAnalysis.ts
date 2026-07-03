/** 业务层 — AI 分析 Hook */

import { useState, useCallback } from "react";
import aiRepository from "@data/repository/ai";
import AIService from "@service/ai/AIService";
import type { ChatMessage, AnalysisContext } from "@data/dto/ai";

export default function useAIAnalysis() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 初始化对话 */
  const initChat = useCallback((context?: AnalysisContext) => {
    const initial = AIService.buildInitialMessages(context);
    setMessages(initial);
    setError(null);
  }, []);

  /** 发送消息 */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);

      const withUser = AIService.appendUserMessage(messages, content);
      setMessages(withUser);

      setLoading(true);
      try {
        const reply = await aiRepository.chat(withUser);
        const withReply = AIService.appendAssistantMessage(withUser, reply);
        setMessages(withReply);
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI 请求失败";
        setError(message);
        setMessages(messages);
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  /** 清空对话 */
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const displayMessages = messages.filter((m) => m.role !== "system");

  return {
    messages: displayMessages,
    loading,
    error,
    initChat,
    sendMessage,
    clearChat,
    hasMessages: displayMessages.length > 0,
  };
}
