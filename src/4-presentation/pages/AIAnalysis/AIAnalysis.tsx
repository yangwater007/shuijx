/** 表现层 — AI 智能分析页面（MCP函数调用 + Thinking + 模型配置） */
import { useState, useRef, useEffect, useCallback, type FC, type KeyboardEvent } from "react";
import useAIChat from "@business/ai/useAIChat";
import type { ChatMessage } from "@infra/types/ai";
import { AI_MODELS } from "@infra/types/ai";

const C = {
  bg: "#0b0e14", card: "#131a24", border: "#1e2a36",
  accent: "#f6b26b", accent2: "#3b82f6",
  text: "#e8edf5", sub: "#9aaec9", dim: "#4a6a8a",
  up: "#ef4444", down: "#22c55e",
};

// ─── Markdown ──────────────────────────────────

const Markdown: FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (<>{parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-bold" style={{ color: C.accent }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("```")) { const code = p.replace(/```\w*\n?/g, ""); return <pre key={i} className="my-2 overflow-x-auto rounded-lg p-3 text-xs" style={{ backgroundColor: C.bg, color: C.sub, border: "1px solid " + C.border }}>{code}</pre>; }
    const cp = p.split(/(`[^`]+`)/g);
    return <span key={i}>{cp.map((c, j) => c.startsWith("`") && c.endsWith("`") ? <code key={j} className="rounded px-1 text-xs" style={{ backgroundColor: C.bg, color: C.accent }}>{c.slice(1, -1)}</code> : <span key={j}>{c}</span>)}</span>;
  })}</>);
};

// ─── Thinking 面板 ─────────────────────────────

const ThinkingPanel: FC<{ text: string; expanded: boolean; onToggle: () => void }> = ({ text, expanded, onToggle }) => {
  if (!text) return null;
  return (
    <div className="mb-2">
      <button type="button" onClick={onToggle}
        className="flex items-center gap-1.5 text-[10px] rounded px-2 py-1 transition-colors hover:bg-white/5"
        style={{ color: C.dim }}>
        <span>{expanded ? "▼" : "▶"}</span> 思考过程
      </button>
      {expanded && (
        <div className="mt-1 rounded-lg p-3 text-xs leading-relaxed max-h-[200px] overflow-y-auto"
          style={{ backgroundColor: C.bg, color: C.dim, border: "1px solid " + C.border }}>
          <Markdown text={text} />
        </div>
      )}
    </div>
  );
};

// ─── 消息气泡 ──────────────────────────────────

const MessageBubble: FC<{ msg: ChatMessage }> = ({ msg }) => {
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";

  if (isTool) {
    return (
      <div className="mb-2 flex justify-center">
        <div className="rounded-lg px-3 py-1.5 text-[10px] md:text-[11px] max-w-[90%] truncate"
          style={{ backgroundColor: C.accent + "15", color: C.accent, border: "1px solid " + C.accent + "33" }}>
          🔧 {msg.toolName ?? "MCP"} {msg.content.length > 100 ? msg.content.slice(0, 100) + "..." : msg.content}
        </div>
      </div>
    );
  }

  const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

  return (
    <div className={"mb-3 flex " + (isUser ? "justify-end" : "justify-start")}>
      <div className="max-w-[88%] md:max-w-[85%] rounded-xl overflow-hidden"
        style={{ backgroundColor: isUser ? C.accent2 : C.card, color: isUser ? "#fff" : C.text, border: isUser ? "none" : "1px solid " + C.border }}>
        
        {!isUser && <ThinkingPanel text={msg.thinking ?? ""} expanded={thinkingExpanded} onToggle={() => setThinkingExpanded(!thinkingExpanded)} />}

        {hasToolCalls && (
          <div className="px-4 py-2" style={{ borderBottom: "1px solid " + C.border }}>
            {msg.toolCalls!.map((tc) => (
              <div key={tc.id} className="flex items-center gap-1.5 text-[10px] mb-0.5" style={{ color: C.accent }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.accent }} />
                {tc.name}
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3">
          {msg.isStreaming && !msg.content && !hasToolCalls ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: C.accent }}>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: C.accent }} />
              分析中...
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed"><Markdown text={msg.content} /></div>
          )}
          {msg.isError && <div className="mt-1 text-xs" style={{ color: C.up }}>请求失败</div>}
          {msg.isInterrupted && <div className="mt-1 text-xs" style={{ color: C.dim }}>已中断</div>}
        </div>
      </div>
    </div>
  );
};

// ─── 快捷操作 ──────────────────────────────────

const QUICK_ACTIONS = [
  { label: "完整复盘", prompt: "请输出今日完整复盘报告，严格按十大模块：大盘概览→情绪速览→连板天梯→主线题材→3日轮动→趋势龙头→龙头定位→情绪周期→明日计划→风险清单。先并行调用market_overview+limit_stats+limit_up_ladder+concept_ranking+sector_analysis+capital_flow获取全貌数据", primary: true },
  { label: "3日轮动", prompt: "请分析近3日板块轮动：1)调用sector_analysis无参看持续强势/低位启动/高位走弱 2)调用capital_flow(type:sector)看资金流向 3)轮动节奏和切换信号" },
  { label: "趋势龙头", prompt: "请分析各主线题材的趋势龙头股技术面：1)调用concept_ranking取前排题材 2)对Top3题材龙头调用kline看均线多头/量价配合/突破形态 3)调用stock_rank看领涨股" },
  { label: "情绪周期", prompt: "请分析市场情绪周期：调用limit_stats+market_overview+broken_limit_up+limit_down，综合涨停/炸板/跌停/涨跌家数，判断处于冰点/修复/启动/发酵/高潮/分歧/退潮哪个阶段" },
];

// ─── 主页面 ────────────────────────────────────

const AIAnalysis: FC = () => {
  const {
    messages, isStreaming, model, setModel,
    frameworks, toggleFramework,
    news, hotStocks,
    config, saveConfig,
    thinkingText, toolCallStatus,
    sendMessage, stopStreaming, clearMessages,
  } = useAIChat();

  const [input, setInput] = useState("");
  const [configOpen, setConfigOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (!isStreaming) inputRef.current?.focus(); }, [isStreaming]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim()); setInput("");
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const handleQuickAction = useCallback((prompt: string) => sendMessage(prompt), [sendMessage]);

  return (
    <div className="flex h-full flex-col md:flex-row" style={{ backgroundColor: C.bg }}>
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3" style={{ borderBottom: "1px solid " + C.border }}>
          <div className="flex items-center gap-2">
            <h1 className="text-sm md:text-base font-bold" style={{ color: C.text }}>AI 分析</h1>
            {toolCallStatus && (
              <span className="text-[10px] rounded px-2 py-0.5 animate-pulse" style={{ backgroundColor: C.accent + "20", color: C.accent }}>
                {toolCallStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value as typeof model)}
              className="rounded-lg px-2 md:px-3 py-1.5 text-[10px] md:text-xs outline-none cursor-pointer"
              style={{ backgroundColor: C.card, color: C.text, border: "1px solid " + C.border }}>
              {AI_MODELS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>

            <button type="button" onClick={() => setConfigOpen(!configOpen)}
              className="rounded-lg px-2 py-1.5 text-[10px] md:text-xs transition-colors hover:bg-white/5"
              style={{ color: configOpen ? C.accent : C.dim }} title="模型配置">
              ⚙
            </button>

            <button type="button" onClick={clearMessages}
              className="rounded-lg px-2 py-1.5 text-[10px] md:text-xs transition-colors hover:bg-white/5"
              style={{ color: C.dim }}>清空</button>
          </div>
        </div>

        {/* 模型配置面板 */}
        {configOpen && (
          <div className="px-4 py-3 space-y-3" style={{ borderBottom: "1px solid " + C.border, backgroundColor: C.card }}>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: C.sub }}>
                <input type="checkbox" checked={config.mcpEnabled} onChange={(e) => saveConfig({ mcpEnabled: e.target.checked })}
                  className="rounded" />
                MCP工具({config.mcpEnabled ? "16个" : "关闭"})
              </label>
              <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: C.sub }}>
                <input type="checkbox" checked={config.thinkingEnabled} onChange={(e) => saveConfig({ thinkingEnabled: e.target.checked })}
                  className="rounded" />
                思维链
              </label>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.sub }}>
                温度
                <input type="range" min="0" max="1.5" step="0.1" value={config.temperature}
                  onChange={(e) => saveConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-16" />
                <span style={{ color: C.dim }}>{config.temperature.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: C.dim }}>API Key</span>
              <input type="password" value={config.apiKey} onChange={(e) => saveConfig({ apiKey: e.target.value })}
                placeholder="留空使用默认"
                className="flex-1 rounded px-2 py-1 text-[11px] outline-none"
                style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }} />
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 md:py-16">
              <div className="mb-4 text-4xl">🤖</div>
              <div className="mb-2 text-lg font-bold" style={{ color: C.text }}>AI 复盘助手</div>
              <div className="mb-6 text-xs md:text-sm text-center" style={{ color: C.sub }}>
                DeepSeek V3/R1 + MCP 16工具 + 同花顺实时指数<br />
                涨停复盘 · 3日轮动 · 趋势龙头 · 情绪周期
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {QUICK_ACTIONS.map((qa) => (
                  <button key={qa.label} type="button" onClick={() => handleQuickAction(qa.prompt)}
                    className="rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-xs font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: qa.primary ? C.accent : C.card,
                      color: qa.primary ? C.bg : C.sub,
                      border: qa.primary ? "none" : "1px solid " + C.border,
                      fontWeight: qa.primary ? "bold" : "normal",
                    }}>
                    {qa.primary ? "🎯 " : ""}{qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="px-3 md:px-4 py-2 md:py-3" style={{ borderTop: "1px solid " + C.border }}>
          <div className="flex items-end gap-2 rounded-xl p-2" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown} placeholder="输入问题，Enter发送 / Shift+Enter换行"
              rows={2} className="flex-1 resize-none bg-transparent px-2 py-1 text-xs md:text-sm outline-none"
              style={{ color: C.text }} disabled={isStreaming} />
            {isStreaming ? (
              <button type="button" onClick={stopStreaming}
                className="rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-bold transition-colors"
                style={{ backgroundColor: C.up, color: "#fff" }}>停止</button>
            ) : (
              <button type="button" onClick={handleSend} disabled={!input.trim()}
                className="rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-bold transition-colors disabled:opacity-40"
                style={{ backgroundColor: C.accent, color: C.bg }}>发送</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysis;