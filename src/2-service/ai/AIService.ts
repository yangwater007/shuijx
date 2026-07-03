/** 服务层 — AI 对话 System Prompt 与消息格式化（纯函数） */

import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

/** 基础 System Prompt 模板 */
const BASE_SYSTEM_PROMPT = `你是A股短线复盘助手，运行在「连板天梯」平台上。
你的职责是帮助用户进行专业、客观的A股短线复盘分析。

## 核心能力
- 涨停板复盘：分析连板天梯、梯队结构、标杆股、炸板率
- 题材热点：梳理当日主线题材、分支扩散、持续性
- 板块轮动：资金流向、高低切换、行业轮动
- 新闻解读：解读财联社电报、公告、政策信号
- 风险提示：指出潜在风险、仓位建议、止盈止损

## 回复规范
- 用中文回复，专业但易懂
- 数据用Markdown表格呈现
- 重要结论加粗
- 不做投资建议，结尾加免责声明
- 若有不确定之处，明确说明`;

/**
 * 构建完整的 System Prompt
 * 拼接用户启用的分析框架 + 市场数据上下文
 */
function buildSystemPrompt(
  enabledFrameworks: AnalysisFramework[],
  marketContext: string
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // 拼接启用的分析框架
  if (enabledFrameworks.length > 0) {
    prompt += "\n\n## 当前启用的分析框架\n";
    for (const fw of enabledFrameworks) {
      prompt += `### ${fw.name}\n${fw.prompt}\n`;
    }
  }

  // 拼接市场数据
  if (marketContext) {
    prompt += `\n\n## 今日市场数据\n\`\`\`\n${marketContext}\n\`\`\``;
  }

  return prompt;
}

/**
 * 将 ChatMessage 数组转为 API 格式（不含 isStreaming 等字段）
 */
function toAPIMessages(
  messages: ChatMessage[],
  systemPrompt: string
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const result: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === "system") continue; // system prompt 已单独处理
    result.push({ role: msg.role, content: msg.content });
  }

  return result;
}

/**
 * 生成唯一消息 ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 创建用户消息对象
 */
function createUserMessage(content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role: "user",
    content,
    timestamp: Date.now(),
  };
}

/**
 * 创建 AI 响应占位（流式用）
 */
function createAssistantPlaceholder(): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content: "",
    isStreaming: true,
    timestamp: Date.now(),
  };
}

/**
 * 格式化新闻为上下文文本
 */
function formatNewsContext(news: Array<{ title?: string; content?: string; brief?: string }>): string {
  if (!news.length) return "";
  const lines = news.slice(0, 15).map((n, i) => {
    const text = n.content ?? n.brief ?? n.title ?? "";
    return `${i + 1}. ${text}`;
  });
  return `\n\n## 最新财经快讯\n${lines.join("\n")}`;
}

const AIService = {
  buildSystemPrompt,
  toAPIMessages,
  generateMessageId,
  createUserMessage,
  createAssistantPlaceholder,
  formatNewsContext,
};

export default AIService;
