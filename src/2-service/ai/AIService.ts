/**
 * 服务层 — AI 对话 System Prompt + DeepSeek 消息编排（纯函数）
 */
import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

// ─── 动态系统提示词 ──────────────────────────

function getTodayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function getDayOfWeek(): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date().getDay()]!;
}

const TODAY = getTodayStr();
const DOW = getDayOfWeek();

/** 完整复盘模板 — 作为默认框架注入 system prompt */
const FULL_REVIEW_PROMPT = `你是A股龙头战法专业复盘分析师。请严格按以下十大模块输出结构化复盘报告，所有判断必须基于下方提供的市场数据。

【输出模块顺序 — 不可增删】
一、大盘概览
二、涨跌停 & 情绪速览
三、连板天梯
四、主线题材复盘（按强度排序）
五、其他支线题材
六、龙头定位总表
七、情绪周期定位
八、明日交易计划
九、开盘信号清单（竞价红绿灯）
十、风险清单 & 操作优先级

【样式要求】
- 用✅⚠️❌符号标注关键变化
- 涨跌幅保留2位小数，带+/-号
- 用emoji图标增强可读性
- 表格用Markdown格式，数据说话
- 情绪阶段判定标准：冰点(涨停<30/晋级<10%/炸板>40%) → 弱修复 → 启动(50-80/晋级>20%) → 发酵(80-100) → 高潮(>100/高度>7) → 分歧 → 退潮
- 持续性评级标准：强(>=15只+3板以上) 中(5-15只+2板) 弱(<5只)
- 交易计划要具体到个股、价位条件、仓位
- 风险预案要有可执行触发条件
- 所有结论必须能从数据推导出来，数据不足时标注[数据暂缺]`;

const BASE_SYSTEM_PROMPT = "你是A股短线复盘AI助手，当前日期: " + TODAY + " " + DOW +
  "。你只基于下方提供的市场数据进行分析。如果数据不足以支撑某个结论，明确标注[数据暂缺]。输出用Markdown格式，专业硬核风格。";

// ─── Framework 整合 ──────────────────────────

function buildSystemPrompt(
  enabledFrameworks: AnalysisFramework[],
  marketContext: string
): string {
  let prompt = BASE_SYSTEM_PROMPT;

  if (enabledFrameworks.length > 0) {
    prompt += "\n\n## 当前启用的分析框架\n";
    for (const fw of enabledFrameworks) {
      prompt += "### " + fw.name + "\n" + fw.prompt + "\n";
    }
  } else {
    prompt += "\n\n" + FULL_REVIEW_PROMPT;
  }

  if (marketContext) {
    prompt += "\n\n## 今日市场数据（基于连板天梯API）\n```\n" + marketContext + "\n```\n";
    prompt += "\n**注**：大盘指数/成交额/北向资金数据暂不可用，请基于涨停数据反向推导市场情绪。";
  }

  return prompt;
}

// ─── 消息格式化 ──────────────────────────────

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

    if (msg.toolCalls) {
      entry.tool_calls = msg.toolCalls;
      entry.content = msg.content || "";
    }

    if (msg.role === "tool" && msg.toolCallId) {
      entry.tool_call_id = msg.toolCallId;
    }

    result.push(entry as typeof result[number]);
  }

  return result;
}

function generateMessageId(): string {
  return "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
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
    return (i + 1) + ". " + text;
  });
  return "\n\n## 最新财经快讯\n" + lines.join("\n");
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
  FULL_REVIEW_PROMPT,
};

export default AIService;