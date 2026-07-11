/** 表现层 — AI 智能分析页面（DeepSeek 流式对话） */
import { useState, useRef, useEffect, useCallback, type FC, type KeyboardEvent } from "react";
import useAIChat from "@business/ai/useAIChat";
import type { ChatMessage } from "@infra/types/ai";
import { AI_MODELS } from "@infra/types/ai";

// ─── 颜色常量 ──────────────────────────────────

const C = {
  bg: "#0b0e14",
  card: "#131a24",
  border: "#1e2a36",
  accent: "#f6b26b",
  accent2: "#3b82f6",
  text: "#e8edf5",
  sub: "#9aaec9",
  dim: "#4a6a8a",
  up: "#ef4444",
  down: "#22c55e",
  green: "#22c55e",
  purple: "#8b5cf6",
};

// ─── Markdown 简单渲染 ─────────────────────────

const Markdown: FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold" style={{ color: C.accent }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("```")) {
          const code = part.replace(/```\w*\n?/g, "");
          return <pre key={i} className="my-2 overflow-x-auto rounded-lg p-3 text-xs" style={{ backgroundColor: C.bg, color: C.sub, border: "1px solid " + C.border }}>{code}</pre>;
        }
        const codeParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {codeParts.map((cp, j) =>
              cp.startsWith("`") && cp.endsWith("`")
                ? <code key={j} className="rounded px-1 text-xs" style={{ backgroundColor: C.bg, color: C.accent }}>{cp.slice(1, -1)}</code>
                : <span key={j}>{cp}</span>
            )}
          </span>
        );
      })}
    </>
  );
};

// ─── 消息气泡 ──────────────────────────────────

const MessageBubble: FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === "user";

  return (
    <div className={"mb-3 flex " + (isUser ? "justify-end" : "justify-start")}>
      <div className="max-w-[85%] rounded-xl px-4 py-3"
        style={{
          backgroundColor: isUser ? C.accent2 : C.card,
          color: isUser ? "#fff" : C.text,
          border: isUser ? "none" : "1px solid " + C.border,
        }}>
        {msg.isStreaming && !msg.content ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: C.accent }}>
            <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: C.accent }} />
            分析中...
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            <Markdown text={msg.content} />
          </div>
        )}
        {msg.isError && <div className="mt-1 text-xs" style={{ color: C.up }}>请求失败</div>}
        {msg.isInterrupted && <div className="mt-1 text-xs" style={{ color: C.dim }}>已中断</div>}
      </div>
    </div>
  );
};

// ─── 快捷操作 ──────────────────────────────────

const QUICK_ACTIONS = [
  { label: "完整复盘", prompt: "请输出今日完整复盘报告，严格按十大模块：大盘概览→情绪速览→连板天梯→主线题材→支线题材→龙头定位→情绪周期→明日计划→竞价清单→风险清单", primary: true },
  { label: "涨停复盘", prompt: "请分析今日涨停板情况，包括最高板、主线题材、首板挖掘和炸板风险" },
  { label: "板块轮动", prompt: "请分析当前板块轮动情况，哪些板块在领涨，哪些在回调？" },
  { label: "市场情绪", prompt: "请分析当前市场情绪，包括涨停家数、炸板率、市场宽度等" },
  { label: "明日策略", prompt: "基于今日涨停数据，给出明日交易计划和重点关注标的" },
];

// ─── 主页面 ────────────────────────────────────

const AIAnalysis: FC = () => {
  const {
    messages, isStreaming, model, setModel,
    frameworks, toggleFramework,
    news, hotStocks, sendMessage, stopStreaming, clearMessages,
  } = useAIChat();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus();
  }, [isStreaming]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleQuickAction = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  return (
    <div className="flex h-full flex-col md:flex-row" style={{ backgroundColor: C.bg }}>
      {/* 左侧：聊天区 */}
      <div className="flex flex-1 flex-col min-w-0 h-full">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3" style={{ borderBottom: "1px solid " + C.border }}>
          <h1 className="text-sm md:text-base font-bold" style={{ color: C.text }}>AI 智能分析</h1>

          <div className="flex items-center gap-1 md:gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value as typeof model)}
              className="rounded-lg px-2 md:px-3 py-1.5 text-[10px] md:text-xs outline-none cursor-pointer"
              style={{ backgroundColor: C.card, color: C.text, border: "1px solid " + C.border }}>
              {AI_MODELS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            <button type="button" onClick={clearMessages}
              className="rounded-lg px-2 md:px-3 py-1.5 text-[10px] md:text-xs transition-colors hover:bg-white/5"
              style={{ color: C.dim }}>
              清空
            </button>

            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5 md:hidden"
              style={{ color: C.sub }}>
              {sidebarOpen ? "x" : "i"}
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 py-3 md:py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 md:py-20">
              <div className="mb-4 text-4xl">🤖</div>
              <div className="mb-2 text-lg font-bold" style={{ color: C.text }}>AI 短线复盘助手</div>
              <div className="mb-6 text-xs md:text-sm text-center" style={{ color: C.sub }}>
                基于 DeepSeek 大模型 + 连板天梯实时数据<br />
                支持涨停复盘、板块分析、资金流向、新闻解读
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {QUICK_ACTIONS.map((qa) => (
                  <button key={qa.label} type="button" onClick={() => handleQuickAction(qa.prompt)}
                    className="rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-xs font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: qa.primary ? C.accent : C.card,
                      color: qa.primary ? C.bg : C.sub,
                      border: qa.primary ? "none" : "1px solid " + C.border,
                      fontWeight: qa.primary ? "bold" : "normal",
                    }}>
                    {qa.primary ? " " : ""}{qa.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-[10px] md:text-xs" style={{ color: C.dim }}>
                未启用分析框架时，默认使用完整复盘模板
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="px-3 md:px-4 py-2 md:py-3" style={{ borderTop: "1px solid " + C.border }}>
          <div className="flex items-end gap-2 rounded-xl p-2" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题，例如：分析今日涨停情况..."
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1 text-xs md:text-sm outline-none"
              style={{ color: C.text }}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button type="button" onClick={stopStreaming}
                className="rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-bold transition-colors"
                style={{ backgroundColor: C.up, color: "#fff" }}>
                停止
              </button>
            ) : (
              <button type="button" onClick={handleSend} disabled={!input.trim()}
                className="rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm font-bold transition-colors disabled:opacity-40"
                style={{ backgroundColor: C.accent, color: C.bg }}>
                发送
              </button>
            )}
          </div>
          <div className="mt-1 text-[10px] text-right" style={{ color: C.dim }}>Enter 发送，Shift+Enter 换行</div>
        </div>
      </div>

      {/* 右侧：面板 — 桌面端始终显示 */}
      <div className={"shrink-0 overflow-y-auto border-l md:block " + (sidebarOpen ? "" : "hidden")}
        style={{ borderColor: C.border, width: "280px" }}>
        {/* 分析框架 */}
        <div className="p-3" style={{ borderBottom: "1px solid " + C.border }}>
          <div className="mb-2 text-xs font-bold" style={{ color: C.sub }}>分析框架</div>
          <div className="flex flex-wrap gap-1.5">
            {frameworks.map((fw) => (
              <button key={fw.id} type="button" onClick={() => toggleFramework(fw.id)}
                className="rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
                style={{
                  backgroundColor: fw.enabled ? C.accent + "20" : C.bg,
                  border: "1px solid " + (fw.enabled ? C.accent : C.border),
                  color: fw.enabled ? C.accent : C.sub,
                }}>
                {fw.name}
              </button>
            ))}
          </div>
        </div>

        {/* 财联社电报 */}
        <div className="p-3" style={{ borderBottom: "1px solid " + C.border }}>
          <div className="mb-2 text-xs font-bold" style={{ color: C.sub }}>
            财联社电报 {news.length > 0 && <span style={{ color: C.dim }}>({news.length})</span>}
          </div>
          <div className="max-h-[30vh] md:max-h-[200px] space-y-2 overflow-y-auto">
            {news.slice(0, 10).map((item, i) => (
              <div key={i} className="text-[10px] md:text-[11px] leading-relaxed" style={{ color: C.sub }}>
                <span className="mr-1 rounded px-1 py-px text-[8px] md:text-[9px]" style={{ backgroundColor: C.accent2, color: "#fff" }}>快讯</span>
                {item.content ?? item.brief ?? item.title ?? ""}
              </div>
            ))}
            {news.length === 0 && <div className="text-[11px]" style={{ color: C.dim }}>加载中...</div>}
          </div>
        </div>

        {/* 开盘啦热榜 */}
        <div className="p-3">
          <div className="mb-2 text-xs font-bold" style={{ color: C.sub }}>
            开盘啦热榜 {hotStocks.length > 0 && <span style={{ color: C.dim }}>({hotStocks.length})</span>}
          </div>
          <div className="max-h-[30vh] md:max-h-[250px] space-y-1.5 overflow-y-auto">
            {hotStocks.slice(0, 12).map((item, i) => {
              const isUp = (item.changePercent ?? 0) >= 0;
              return (
                <div key={i} className="flex items-center justify-between rounded px-2 py-1.5 text-[10px] md:text-[11px]"
                  style={{ backgroundColor: C.bg }}>
                  <div className="flex items-center gap-1 md:gap-2 min-w-0">
                    <span className="w-5 text-center font-bold" style={{ color: i < 3 ? C.accent : C.dim }}>{i + 1}</span>
                    <span className="font-medium truncate" style={{ color: C.text }}>{item.name ?? ""}</span>
                    <span className="hidden sm:inline text-[9px] md:text-[10px]" style={{ color: C.dim }}>{item.code ?? ""}</span>
                  </div>
                  <span className="font-bold shrink-0" style={{ color: isUp ? C.up : C.down }}>
                    {isUp ? "+" : ""}{(item.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysis;