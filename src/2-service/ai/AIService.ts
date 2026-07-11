/**
 * 服务层 — AI 对话 System Prompt + DeepSeek 消息编排
 */
import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

function getTodayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getDayOfWeek(): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date().getDay()]!;
}

const TODAY = getTodayStr();
const DOW = getDayOfWeek();

const FULL_REVIEW_PROMPT = "你是A股龙头战法专业复盘分析师。请严格按以下十大模块输出结构化复盘报告。\n\n" +
  "【输出模块 — 不可增删】\n" +
  "一、大盘概览\n" +
  "二、涨跌停 & 情绪速览\n" +
  "三、连板天梯\n" +
  "四、主线题材复盘（按强度排序）\n" +
  "五、其他支线题材\n" +
  "六、龙头定位总表（含总龙头/题材龙/中军）\n" +
  "七、情绪周期定位\n" +
  "八、明日交易计划\n" +
  "九、开盘信号清单（竞价红绿灯）\n" +
  "十、风险清单 & 操作优先级\n\n" +
  "【八~十模块数据驱动规则 — 必须遵守】\n" +
  "- 仓位建议根据综合风险等级：低风险→激进8成/稳健6成，中风险→激进5成/稳健3成，高风险→激进2成/稳健1成或空仓\n" +
  "- 方案A（主线接力）标的必须来自\"题材分布\"中[强]评级题材的龙头/跟风股\n" +
  "- 方案B（次线备选）标的来自[中]评级题材\n" +
  "- 方案C（弱转强预案）标的来自\"断板高位股\"列表，确认信号：竞价高开+3%以上或开盘5分钟内翻红\n" +
  "- 方案D（风险应对）触发降仓条件：①竞价跌停>5只 ②总龙头低开<-3% ③炸板率连续2日上升\n" +
  "- 竞价红绿灯优先监控：总龙头竞价、主线板块跟风强度、跌停数量、1进2溢价率\n" +
  "- 风险清单必须引用\"关键趋势信号\"中的炸板率趋势、连板高度趋势、风险等级\n" +
  "- 用✅⚠️❌标注变化，涨跌幅保留2位小数，表格用Markdown";

const BASE_SYSTEM_PROMPT = "你是A股短线复盘AI助手，当前日期: " + TODAY + " " + DOW +
  "。大盘指数来自东方财富实时行情，涨停数据来自连板天梯API。你只基于下方数据进行分析，数据不足处标注[数据暂缺]。输出Markdown格式，专业硬核风格。";

function buildSystemPrompt(enabledFrameworks: AnalysisFramework[], marketContext: string): string {
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
    prompt += "\n\n## 今日市场数据\n```\n" + marketContext + "\n```\n";
  }
  return prompt;
}

function toAPIMessages(messages: ChatMessage[], systemPrompt: string): Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }> {
  const result: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }> = [
    { role: "system", content: systemPrompt },
  ];
  for (const msg of messages) {
    if (msg.role === "system") continue;
    const entry: { role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] } = { role: msg.role, content: msg.content };
    if (msg.toolCalls) { entry.tool_calls = msg.toolCalls; entry.content = msg.content || ""; }
    if (msg.role === "tool" && msg.toolCallId) { entry.tool_call_id = msg.toolCallId; }
    result.push(entry as typeof result[number]);
  }
  return result;
}

function generateMessageId(): string { return "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8); }
function createUserMessage(content: string): ChatMessage { return { id: generateMessageId(), role: "user", content, timestamp: Date.now() }; }
function createAssistantPlaceholder(): ChatMessage { return { id: generateMessageId(), role: "assistant", content: "", isStreaming: true, timestamp: Date.now() }; }

function createToolCallMessage(toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>): ChatMessage {
  return { id: generateMessageId(), role: "assistant", content: "",
    toolCalls: toolCalls.map((tc) => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments })), timestamp: Date.now() };
}

function createToolResultMessage(toolCallId: string, toolName: string, content: string): ChatMessage {
  return { id: generateMessageId(), role: "tool", content, toolCallId, toolName, timestamp: Date.now() };
}

function formatNewsContext(news: Array<{ title?: string; content?: string; brief?: string }>): string {
  if (!news.length) return "";
  const lines = news.slice(0, 15).map((n, i) => { const text = n.content ?? n.brief ?? n.title ?? ""; return (i + 1) + ". " + text; });
  return "\n\n## 最新财经快讯\n" + lines.join("\n");
}

const AIService = { buildSystemPrompt, toAPIMessages, generateMessageId, createUserMessage, createAssistantPlaceholder, createToolCallMessage, createToolResultMessage, formatNewsContext, FULL_REVIEW_PROMPT };
export default AIService;