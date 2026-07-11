/**
 * 服务层 — AI 对话 System Prompt + 消息编排（支持MCP工具调用上下文）
 */
import type { ChatMessage, AnalysisFramework } from "@infra/types/ai";

function getTodayStr(): string { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function getDayOfWeek(): string { const days = ["周日","周一","周二","周三","周四","周五","周六"]; return days[new Date().getDay()]!; }
const TODAY = getTodayStr(); const DOW = getDayOfWeek();

const FULL_REVIEW_PROMPT = "你是A股龙头战法专业复盘分析师。你可以调用MCP工具获取实时数据。请严格按以下十大模块输出结构化复盘报告。\n\n" +
  "【输出模块 — 不可增删】\n" +
  "一、大盘概览（指数+涨跌家数+成交额，调用market_overview）\n" +
  "二、涨跌停 & 情绪速览（调用limit_stats获取封板/炸板/封板率）\n" +
  "三、连板天梯（调用limit_up_ladder获取梯队结构）\n" +
  "四、主线题材复盘（调用concept_ranking+sector_analysis，按强度排序）\n" +
  "五、其他支线题材\n" +
  "六、龙头定位总表（含总龙头/题材龙/中军）\n" +
  "七、情绪周期定位（三日对比+阶段判定）\n" +
  "八、明日交易计划（含仓位建议、4套方案）\n" +
  "九、开盘信号清单（竞价红绿灯）\n" +
  "十、风险清单 & 操作优先级\n\n" +
  "【规则】\n- 仓位：低风险→激进8成/稳健6成，中风险→5/3，高风险→2/1\n" +
  "- 方案A主线接力标的来自[强]评级题材，方案B来自[中]评级\n" +
  "- 方案C弱转强来自断板高位股，方案D降仓：竞价跌停>5/总龙头低开<-3%/炸板率连升2日\n" +
  "- 用✅⚠️❌标注，涨跌幅保留2位小数，表格用Markdown\n" +
  "- 先调数据再分析，每个模块注明数据来源工具名";

const BASE_PROMPT = "你是A股短线复盘AI助手，当前日期: " + TODAY + " " + DOW +
  "。你可以调用MCP工具获取实时行情。数据不足时标注[数据暂缺]。Markdown格式，专业硬核。";

function buildSystemPrompt(enabled: AnalysisFramework[], marketContext: string): string {
  let p = BASE_PROMPT;
  if (enabled.length > 0) { p += "\n\n## 分析框架\n"; for (const fw of enabled) p += "### " + fw.name + "\n" + fw.prompt + "\n"; }
  else p += "\n\n" + FULL_REVIEW_PROMPT;
  if (marketContext) p += "\n\n## 静态市场数据（快速参考，优先使用MCP工具获取最新数据）\n```\n" + marketContext + "\n```\n";
  return p;
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
  if (!news.length) return ""; return "\n\n## 财经快讯\n" + news.slice(0, 15).map((n,i) => (i+1)+". "+(n.content??n.brief??n.title??"")).join("\n");
}

const AIService = { buildSystemPrompt, toAPIMessages, generateMessageId, createUserMessage, createAssistantPlaceholder, createToolCallMessage, createToolResultMessage, formatNewsContext, FULL_REVIEW_PROMPT };
export default AIService;