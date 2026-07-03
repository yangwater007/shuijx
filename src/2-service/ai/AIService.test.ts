/** 服务层测试 — AIService */

import { describe, it, expect } from "vitest";
import AIService from "./AIService";
import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

describe("AIService", () => {
  describe("buildSystemPrompt", () => {
    it("无框架无上下文时返回基础 prompt", () => {
      const prompt = AIService.buildSystemPrompt([], "");
      expect(prompt).toContain("A股短线复盘助手");
      expect(prompt).toContain("涨停板复盘");
    });

    it("含启用的分析框架时追加框架内容", () => {
      const frameworks: AnalysisFramework[] = [
        { id: "test", name: "测试框架", description: "", prompt: "请做测试分析", enabled: true, isBuiltIn: false },
      ];
      const prompt = AIService.buildSystemPrompt(frameworks, "");
      expect(prompt).toContain("测试框架");
      expect(prompt).toContain("请做测试分析");
    });

    it("含市场上下文时追加数据", () => {
      const prompt = AIService.buildSystemPrompt([], "涨停总数: 50只");
      expect(prompt).toContain("涨停总数: 50只");
      expect(prompt).toContain("今日市场数据");
    });
  });

  describe("toAPIMessages", () => {
    it("将 ChatMessage 转为 API 格式，自动添加 system prompt", () => {
      const messages: ChatMessage[] = [
        { id: "1", role: "user", content: "hello", timestamp: 1 },
      ];
      const result = AIService.toAPIMessages(messages, "custom system");
      expect(result).toHaveLength(2);
      expect(result[0]!.role).toBe("system");
      expect(result[0]!.content).toBe("custom system");
      expect(result[1]!.role).toBe("user");
      expect(result[1]!.content).toBe("hello");
    });

    it("跳过原始 system 消息", () => {
      const messages: ChatMessage[] = [
        { id: "0", role: "system", content: "old", timestamp: 0 },
        { id: "1", role: "user", content: "q", timestamp: 1 },
      ];
      const result = AIService.toAPIMessages(messages, "new system");
      // 只有 system + user，不含旧的 system
      expect(result).toHaveLength(2);
      expect(result[0]!.content).toBe("new system");
    });
  });

  describe("createUserMessage", () => {
    it("创建带 id 和 timestamp 的用户消息", () => {
      const msg = AIService.createUserMessage("测试问题");
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("测试问题");
      expect(msg.id).toMatch(/^msg_\d+/);
      expect(msg.timestamp).toBeGreaterThan(0);
    });
  });

  describe("createAssistantPlaceholder", () => {
    it("创建流式占位消息", () => {
      const msg = AIService.createAssistantPlaceholder();
      expect(msg.role).toBe("assistant");
      expect(msg.content).toBe("");
      expect(msg.isStreaming).toBe(true);
    });
  });

  describe("formatNewsContext", () => {
    it("格式化新闻数组为上下文字符串", () => {
      const news = [
        { content: "新闻1内容" },
        { brief: "新闻2摘要" },
        { title: "新闻3标题" },
      ];
      const ctx = AIService.formatNewsContext(news);
      expect(ctx).toContain("新闻1内容");
      expect(ctx).toContain("新闻2摘要");
      expect(ctx).toContain("最新财经快讯");
    });

    it("空数组返回空字符串", () => {
      expect(AIService.formatNewsContext([])).toBe("");
    });
  });
});
