/**
 * 服务层 — AI 对话 System Prompt + 消息编排
 */
import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

function getTodayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function getDayOfWeek(): string { const days = ["周日","周一","周二","周三","周四","周五","周六"]; return days[new Date().getDay()]!; }
const TODAY = getTodayStr(); const DOW = getDayOfWeek();

const FULL_REVIEW_PROMPT = "你是A股龙头战法专业复盘分析师。请严格按以下十大模块输出结构化复盘报告。\n\n" +
  "【输出模块 — 不可增删】\n" +
  "一、大盘概览（含指数+涨跌家数+成交额）\n二、涨跌停 & 情绪速览\n三、连板天梯\n四、主线题材复盘\n五、其他支线题材\n六、龙头定位总表\n七、情绪周期定位\n八、明日交易计划\n" +
  "九、开盘信号清单（竞价红绿灯）\n十、风险清单 & 操作优先级\n\n" +
  "【八~十模块数据驱动规则 — 必须遵守】\n" +
  "- 仓位：低风险→激进8成/稳健6成，中风险→5/3，高风险→2/1或空仓\n" +
  "- 方案A主线接力标的来自[强]评级题材龙头/跟风\n- 方案B次线来自[中]评级题材\n" +
  "- 方案C弱转强来自\"断板高位股\"列表，确认信号：竞价高开>+3%或开盘5分翻红\n" +
  "- 方案D降仓条件：竞价跌停>5 / 总龙头低开<-3% / 炸板率连升2日\n" +
  "- 竞价红灯优先监控：总龙头竞价、主线跟风、跌停数、1进2溢价率\n" +
  "- 风险清单引用炸板率趋势、连板高度趋势、综合风险等级\n- 用✅⚠️❌标注，涨跌幅保留2位小数，表格Markdown";

const BASE_SYSTEM_PROMPT = "你是A股短线复盘AI助手，当前日期: " + TODAY + " " + DOW +
  "。大盘指数+涨跌家数来自同花顺实时行情，涨停数据来自连板天梯API。只基于下方数据进行分析，数据不足处标注[数据暂缺]。Markdown格式，专业硬核。";

function buildSystemPrompt(enabledFrameworks: AnalysisFramework[], marketContext: string): string {
  let prompt = BASE_SYSTEM_PROMPT;
  if (enabledFrameworks.length > 0) { prompt += "\n\n## 当前启用的分析框架\n"; for (const fw of enabledFrameworks) prompt += "### " + fw.name + "\n" + fw.prompt + "\n"; }
  else prompt += "\n\n" + FULL_REVIEW_PROMPT;
  if (marketContext) prompt += "\n\n## 今日市场数据\n```\n" + marketContext + "\n```\n";
  return prompt;
}

function toAPIMessages(messages: ChatMessage[], systemPrompt: string): Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }> {
  const result: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }> = [{ role: "system", content: systemPrompt }];
  for (const msg of messages) {
    if (msg.role === "system") continue;
    const entry: { role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] } = { role: msg.role, content: msg.content };
    if (msg.toolCalls) { entry.tool_calls = msg.toolCalls; entry.content = msg.content || ""; }
    if (msg.role === "tool" && msg.toolCallId) entry.tool_call_id = msg.toolCallId;
    result.push(entry as typeof result[number]);
  }
  return result;
}

function generateMessageId(): string { return "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8); }
function createUserMessage(c: string): ChatMessage { return { id: generateMessageId(), role: "user", content: c, timestamp: Date.now() }; }
function createAssistantPlaceholder(): ChatMessage { return { id: generateMessageId(), role: "assistant", content: "", isStreaming: true, timestamp: Date.now() }; }

function createToolCallMessage(tc: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>): ChatMessage {
  return { id: generateMessageId(), role: "assistant", content: "", toolCalls: tc.map((c) => ({ id: c.id, name: c.function.name, arguments: c.function.arguments })), timestamp: Date.now() };
}
function createToolResultMessage(tid: string, tn: string, content: string): ChatMessage { return { id: generateMessageId(), role: "tool", content, toolCallId: tid, toolName: tn, timestamp: Date.now() }; }
function formatNewsContext(news: Array<{ title?: string; content?: string; brief?: string }>): string {
  if (!news.length) return ""; return "\n\n## 最新财经快讯\n" + news.slice(0,15).map((n,i) => (i+1)+". "+(n.content??n.brief??n.title??"")).join("\n");
}

const AIService = { buildSystemPrompt, toAPIMessages, generateMessageId, createUserMessage, createAssistantPlaceholder, createToolCallMessage, createToolResultMessage, formatNewsContext, FULL_REVIEW_PROMPT };
export default AIService;