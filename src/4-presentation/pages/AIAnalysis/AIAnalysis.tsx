/**
 * AIAnalysis — AI智能分析页面
 * 复刻 stock.quicktiny.cn/ai
 * 功能：AI对话 + 新闻TGB + 热榜 + 分析框架
 */

import { useState, useRef, useEffect, useCallback, type FC, type KeyboardEvent } from "react";
import useAIChat from "@business/ai/useAIChat";
import type { ChatMessage } from "@infra/types/ai";
import { AI_MODELS } from "@infra/types/ai";

// ─── 颜色 ────────────────────────────────

const C = {
  bg: "#0b0e14",
  card: "#131a24",
  border: "#1e2a36",
  accent: "#f6b26b",
  text: "#e8edf5",
  sub: "#9aaec9",
  dim: "#4a6a8a",
  up: "#ef4444",
  down: "#22c55e",
};

// ─── Markdown 简单渲染 ────────────────────

const Markdown: FC<{ text: string }> = ({ text }) => {
  // 将 **加粗** 转为 <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-bold" style={{ color: C.accent }}>{part.slice(2, -2)}</strong>;
        }
        // 代码块
        if (part.startsWith("```")) {
          const code = part.replace(/```\w*\n?/g, "");
          return <pre key={i} className="my-2 overflow-x-auto rounded-lg p-3 text-xs" style={{ backgroundColor: C.bg, color: C.sub, border: `1px solid ${C.border}` }}>{code}</pre>;
        }
        // 行内代码
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

// ─── 消息气泡 ────────────────────────────

const MessageBubble: FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === "user";
  const isStreaming = msg.isStreaming && !msg.content;
  const showCursor = msg.isStreaming && msg.content.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? "order-1" : "order-1"}`}>
        {/* 头像 */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : "justify-start"}`}>
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: isUser ? C.accent : "#3b82f6", color: "#fff" }}>
            {isUser ? "你" : "AI"}
          </div>
          <span className="text-xs" style={{ color: C.dim }}>
            {isUser ? "用户" : "连板天梯 AI"}
          </span>
        </div>

        {/* 气泡 */}
        <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={{
            backgroundColor: isUser ? "rgba(246,178,107,0.1)" : C.card,
            border: `1px solid ${isUser ? "rgba(246,178,107,0.2)" : C.border}`,
            color: C.text,
          }}>
          {msg.isError ? (
            <span style={{ color: C.down }}>{msg.content}</span>
          ) : msg.isInterrupted ? (
            <span>
              <Markdown text={msg.content} />
              <span className="ml-1 text-xs italic" style={{ color: C.dim }}>(已中断)</span>
            </span>
          ) : isStreaming ? (
            <span>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              <span className="ml-2 text-xs" style={{ color: C.dim }}>思考中...</span>
            </span>
          ) : (
            <Markdown text={msg.content} />
          )}
          {showCursor && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse" style={{ backgroundColor: C.accent }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 新闻 TGB 侧边组件 ────────────────────

const NewsTicker: FC<{ news: Array<{ id: number; content: string; ctime: number }> }> = ({ news }) => {
  if (!news.length) return null;

  return (
    <div className="overflow-hidden rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: C.border }}>
        <span className="text-xs font-bold" style={{ color: C.text }}>财联社电报</span>
        <span className="text-[10px]" style={{ color: C.dim }}>{news.length}条</span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {news.slice(0, 20).map((item) => (
          <div key={item.id} className="border-b px-4 py-2.5 text-xs leading-relaxed transition-colors hover:bg-white/[0.03]"
            style={{ borderColor: C.border, color: C.sub }}>
            <span className="mr-1" style={{ color: C.accent }}>⚡</span>
            {item.content}
            <span className="ml-2 text-[10px]" style={{ color: C.dim }}>
              {new Date(item.ctime * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── 快速问题 ─────────────────────────────

const QUICK_QUESTIONS = [
  "今天的涨停板有哪些看点？",
  "主线题材是什么？",
  "市场情绪怎么样？",
  "帮我复盘今天的行情",
  "最近的板块轮动规律",
  "热门股票有哪些？",
];

// ─── 分析框架面板 ─────────────────────────

const FrameworkPanel: FC<{
  frameworks: ReturnType<typeof useAIChat>["frameworks"];
  onToggle: (id: string) => void;
}> = ({ frameworks, onToggle }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-bold"
        style={{ color: C.text }}>
        <span>分析框架 {frameworks.filter((f) => f.enabled).length > 0 && (
          <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: C.accent, color: "#000" }}>
            {frameworks.filter((f) => f.enabled).length}
          </span>
        )}</span>
        <span style={{ color: C.dim }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t px-4 py-2" style={{ borderColor: C.border }}>
          <p className="mb-2 text-[10px] leading-relaxed" style={{ color: C.dim }}>
            启用分析框架后，AI 助手会按照你选择的框架进行结构化分析。最多同时启用3个。
          </p>
          {frameworks.map((fw) => (
            <label key={fw.id} className="flex items-start gap-2 py-1.5 cursor-pointer">
              <input type="checkbox" checked={fw.enabled} onChange={() => onToggle(fw.id)}
                className="mt-0.5 accent-orange-400" />
              <div>
                <span className="text-xs font-medium" style={{ color: fw.enabled ? C.text : C.sub }}>{fw.name}</span>
                <p className="text-[10px]" style={{ color: C.dim }}>{fw.description}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 主页面 ──────────────────────────────

const AIAnalysis: FC = () => {
  const {
    messages, isStreaming, model, setModel,
    frameworks, enabledFrameworks, toggleFramework,
    news, hotStocks,
    sendMessage, stopStreaming, clearMessages,
  } = useAIChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-100px)]">
      {/* ═══ 左侧：对话区 ═══ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* 顶部标题栏 */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">AI 智能分析</h1>
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: C.card, color: C.sub }}>DeepSeek</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 模型选择 */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as typeof model)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none"
              style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.border}` }}>
              {AI_MODELS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
            <button type="button" onClick={clearMessages}
              className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={{ color: C.dim, border: `1px solid ${C.border}` }}>
              清空对话
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto rounded-xl p-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 text-5xl opacity-30">🤖</div>
              <p className="mb-6 text-sm" style={{ color: C.dim }}>
                AI 智能助手 — 基于 DeepSeek 大模型，结合实时市场数据
              </p>
              {/* 快速问题 */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q} type="button" onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="rounded-full px-3 py-1.5 text-xs transition-colors hover:bg-white/10"
                    style={{ backgroundColor: C.card, color: C.sub, border: `1px solid ${C.border}` }}>
                    {q}
                  </button>
                ))}
              </div>
              <p className="mt-8 text-[10px] text-center" style={{ color: C.dim }}>
                AI可能会犯错，请核实重要信息 · 不构成投资建议
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 输入区 */}
        <div className="mt-3 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的复盘问题... (Enter发送, Shift+Enter换行)"
            rows={2}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none transition-colors focus:border-orange-400"
            style={{ backgroundColor: C.card, color: C.text, border: `1px solid ${C.border}`, scrollbarWidth: "thin" }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button type="button" onClick={stopStreaming}
              className="rounded-xl px-5 py-3 text-sm font-bold transition-colors"
              style={{ backgroundColor: C.down, color: "#fff" }}>
              停止
            </button>
          ) : (
            <button type="button" onClick={handleSend} disabled={!input.trim()}
              className="rounded-xl px-5 py-3 text-sm font-bold transition-opacity disabled:opacity-30"
              style={{ backgroundColor: C.accent, color: "#000" }}>
              发送
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-[10px]" style={{ color: C.dim }}>
          AI可能会犯错，请核实重要信息 · 不构成投资建议
        </p>
      </div>

      {/* ═══ 右侧：信息面板 ═══ */}
      <div className="w-[280px] shrink-0 space-y-3 overflow-y-auto hidden lg:block">
        {/* 分析框架 */}
        <FrameworkPanel frameworks={frameworks} onToggle={toggleFramework} />

        {/* 热榜 */}
        {hotStocks.length > 0 && (
          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: C.border }}>
              <span className="text-xs font-bold" style={{ color: C.text }}>热榜</span>
              <span className="text-[10px]" style={{ color: C.dim }}>开盘啦</span>
            </div>
            <div className="max-h-[250px] overflow-y-auto">
              {hotStocks.slice(0, 15).map((item, idx) => (
                <div key={item.code} className="flex items-center gap-2 border-b px-4 py-2 text-xs"
                  style={{ borderColor: C.border }}>
                  <span className="w-5 text-center font-bold" style={{ color: idx < 3 ? C.accent : C.dim }}>{item.hotRank}</span>
                  <span className="flex-1 font-medium truncate" style={{ color: C.text }}>{item.name}</span>
                  <span style={{ color: item.changePercent >= 0 ? C.up : C.down }}>
                    {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 新闻电报 */}
        <NewsTicker news={news} />
      </div>
    </div>
  );
};

export default AIAnalysis;
