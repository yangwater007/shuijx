/** 服务层 — AI 对话 System Prompt + DeepSeek Function Calling 编排（纯函数） */

import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

// ─── System Prompt ────────────────────────────

/** 基础 System Prompt 模板（含 MCP 工具调用规范） */
const BASE_SYSTEM_PROMPT = `你是A股短线复盘助手，运行在「连板天梯」平台上。
你的职责是帮助用户进行专业、客观的A股短线复盘分析。

## 核心能力
- 涨停板复盘：分析连板天梯、梯队结构、标杆股、炸板率
- 题材热点：梳理当日主线题材、分支扩散、持续性
- 板块轮动：资金流向、高低切换、行业轮动
- 数据查询：通过工具调用获取实时市场数据、K线、资金流向
- 新闻解读：解读财经快讯、公告、政策信号
- 风险提示：指出潜在风险、仓位建议

## 工具调用规范
你有一组工具可以查询A股实时数据。当需要数据时，直接调用工具获取，不要猜测。
- 查看涨停梯队 → 调用 limit_up_ladder
- 查询个股K线 → 调用 kline
- 搜索股票 → 调用 stock_search
- 市场概况 → 调用 market_overview
- 资金流向 → 调用 capital_flow
- 查询新闻 → 调用 cls_news
- 板块轮动 → 调用 sector_analysis

## 回复规范
- 用中文回复，专业但易懂
- 数据用Markdown表格呈现
- 个股用 [名称(代码)](https://stock.quicktiny.cn/quote/代码) 格式输出链接
- 重要结论加粗
- 不做投资建议，结尾加免责声明
- 若有不确定之处，明确说明`;

// ─── Framework 整合 ──────────────────────────

function buildSystemPrompt(
  enabledFrameworks: AnalysisFramework[],
  marketContext: string
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (enabledFrameworks.length > 0) {
    prompt += "\n\n## 当前启用的分析框架\n";
    for (const fw of enabledFrameworks) {
      prompt += `### ${fw.name}\n${fw.prompt}\n`;
    }
  }

  if (marketContext) {
    prompt += `\n\n## 今日市场数据\n\`\`\`\n${marketContext}\n\`\`\``;
  }

  return prompt;
}

// ─── 消息格式化 ───────────────────────────────

function toAPIMessages(
  messages: ChatMessage[],
  systemPrompt: string
): Array<{ role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[] }> {
  const result: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[] }> = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const entry: { role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] } = { role: msg.role, content: msg.content };
    
    // 传递 tool_calls（AI 决定调用的工具）
    if (msg.toolCalls) {
      entry.tool_calls = msg.toolCalls;
      entry.content = msg.content || ""; // DeepSeek 函数调用时 content 可为 null
    }
    
    // 传递 tool 角色消息
    if (msg.role === "tool" && msg.toolCallId) {
      entry.tool_call_id = msg.toolCallId;
    }

    result.push(entry as typeof result[number]);
  }

  return result;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createUserMessage(content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role: "user",
    content,
    timestamp: Date.now(),
  };
}

function createAssistantPlaceholder(): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content: "",
    isStreaming: true,
    timestamp: Date.now(),
  };
}

/** 创建工具调用消息（AI 决定要调工具） */
function createToolCallMessage(toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>): ChatMessage {
  return {
    id: generateMessageId(),
    role: "assistant",
    content: "",
    toolCalls: toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
    })),
    timestamp: Date.now(),
  };
}

/** 创建工具结果消息 */
function createToolResultMessage(toolCallId: string, toolName: string, content: string): ChatMessage {
  return {
    id: generateMessageId(),
    role: "tool",
    content,
    toolCallId,
    toolName,
    timestamp: Date.now(),
  };
}

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
  createToolCallMessage,
  createToolResultMessage,
  formatNewsContext,
};

export default AIService;