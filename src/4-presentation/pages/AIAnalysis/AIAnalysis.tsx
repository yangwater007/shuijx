/** 表现层 — AI 智能分析页面（DeepSeek + MCP 工具调用） */

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

// ─── Markdown 简单渲染 ────────────────────────

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
          return <pre key={i} className="my-2 overflow-x-auto rounded-lg p-3 text-xs" style={{ backgroundColor: C.bg, color: C.sub, border: `1px solid ${C.border}` }}>{code}</pre>;
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

// ─── 消息气泡 ─────────────────────────────────

const MessageBubble: FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isUser = msg.role === "user";
  const isTool = msg.role === "tool";

  if (isTool) {
    return (
      <div className="mb-2 flex justify-center">
        <div className="rounded-lg px-3 py-1.5 text-[11px]" style={{ backgroundColor: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}33` }}>
          🔧 调用工具：{msg.toolName ?? "MCP"} → {msg.content.slice(0, 80)}{msg.content.length > 80 ? "..." : ""}
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-3 ${isUser ? "" : ""}`}
        style={{
          backgroundColor: isUser ? C.accent2 : C.card,
          color: isUser ? "#fff" : C.text,
          border: isUser ? "none" : `1px solid ${C.border}`,
        }}>
        {msg.isToolRunning ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: C.accent }}>
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            正在查询数据...
          </div>
        ) : msg.isStreaming && !msg.content ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: C.sub }}>
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            思考中...
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            <Markdown text={msg.content} />
            {msg.isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />}
          </div>
        )}
        {msg.isError && <div className="mt-1 text-xs" style={{ color: C.up }}>⚠ 请求失败</div>}
        {msg.isInterrupted && <div className="mt-1 text-xs" style={{ color: C.dim }}>已中断</div>}
      </div>
    </div>
  );
};

// ─── 主页面 ────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "今日涨停复盘", prompt: "请分析今日涨停板情况，包括最高板、主线题材、首板挖掘和炸板风险" },
  { label: "板块轮动分析", prompt: "请分析当前板块轮动情况，哪些板块在领涨，哪些在回调" },
  { label: "市场情绪", prompt: "请分析当前市场情绪，包括涨停家数、炸板率、市场宽度等" },
  { label: "资金流向", prompt: "请分析今日资金流向，主力资金和北向资金的动向" },
];

const AIAnalysis: FC = () => {
  const {
    messages, isStreaming, model, setModel,
    frameworks, toggleFramework,
    news, hotStocks, mcpReady,
    sendMessage, stopStreaming, clearMessages,
  } = useAIChat();

  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 聚焦输入框
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
    <div className="flex h-full" style={{ backgroundColor: C.bg }}>
      {/* 左侧：聊天区 */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold" style={{ color: C.text }}>AI 智能分析</h1>
            {/* MCP 状态 */}
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: mcpReady ? `${C.green}15` : `${C.dim}15`,
                color: mcpReady ? C.green : C.dim,
              }}>
              <span className={`h-1.5 w-1.5 rounded-full ${mcpReady ? "animate-pulse" : ""}`}
                style={{ backgroundColor: mcpReady ? C.green : C.dim }} />
              {mcpReady ? "MCP 已连接 (67工具)" : "MCP 连接中..."}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 模型选择 */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as typeof model)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none cursor-pointer"
              style={{ backgroundColor: C.card, color: C.text, border: `1px solid ${C.border}` }}>
              {AI_MODELS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            {/* 清空 */}
            <button type="button" onClick={clearMessages}
              className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={{ color: C.dim }}>
              清空对话
            </button>

            {/* 侧边栏切换 */}
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={{ color: C.sub }}>
              {sidebarOpen ? "◀" : "▶"}
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 text-4xl">🤖</div>
              <div className="mb-2 text-lg font-bold" style={{ color: C.text }}>AI 短线复盘助手</div>
              <div className="mb-6 text-sm text-center" style={{ color: C.sub }}>
                基于 DeepSeek 大模型 + Wudao Data MCP 实时数据<br />
                支持涨停复盘、板块分析、资金流向、新闻解读
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {QUICK_ACTIONS.map((qa) => (
                  <button key={qa.label} type="button" onClick={() => handleQuickAction(qa.prompt)}
                    className="rounded-lg px-4 py-2 text-xs transition-all hover:scale-105"
                    style={{ backgroundColor: C.card, color: C.text, border: `1px solid ${C.border}` }}>
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-end gap-2 rounded-xl p-2" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题，例如：分析今日涨停情况..."
              rows={2}
              className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none"
              style={{ color: C.text }}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button type="button" onClick={stopStreaming}
                className="rounded-lg px-4 py-2 text-sm font-bold transition-colors"
                style={{ backgroundColor: C.up, color: "#fff" }}>
                停止
              </button>
            ) : (
              <button type="button" onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40"
                style={{ backgroundColor: C.accent, color: C.bg }}>
                发送
              </button>
            )}
          </div>
          <div className="mt-1 text-[10px] text-right" style={{ color: C.dim }}>Enter 发送，Shift+Enter 换行</div>
        </div>
      </div>

      {/* 右侧：边栏 */}
      {sidebarOpen && (
        <div className="w-[280px] shrink-0 overflow-y-auto border-l" style={{ borderColor: C.border }}>
          {/* 分析框架 */}
          <div className="p-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="mb-2 text-xs font-bold" style={{ color: C.sub }}>分析框架</div>
            <div className="flex flex-wrap gap-1.5">
              {frameworks.map((fw) => (
                <button key={fw.id} type="button" onClick={() => toggleFramework(fw.id)}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] transition-all"
                  style={{
                    backgroundColor: fw.enabled ? `${C.accent}20` : C.bg,
                    border: `1px solid ${fw.enabled ? C.accent : C.border}`,
                    color: fw.enabled ? C.accent : C.sub,
                  }}>
                  {fw.name}
                </button>
              ))}
            </div>
          </div>

          {/* 新闻快讯 */}
          <div className="p-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="mb-2 text-xs font-bold" style={{ color: C.sub }}>
              财联社电报 {news.length > 0 && <span style={{ color: C.dim }}>({news.length})</span>}
            </div>
            <div className="max-h-[200px] space-y-2 overflow-y-auto">
              {news.slice(0, 10).map((item, i) => (
                <div key={i} className="text-[11px] leading-relaxed" style={{ color: C.sub }}>
                  <span className="mr-1 rounded px-1 py-px text-[9px]" style={{ backgroundColor: C.accent2, color: "#fff" }}>快讯</span>
                  {item.content ?? item.brief ?? item.title ?? ""}
                </div>
              ))}
              {news.length === 0 && <div className="text-[11px]" style={{ color: C.dim }}>加载中...</div>}
            </div>
          </div>

          {/* 热榜 */}
          <div className="p-3">
            <div className="mb-2 text-xs font-bold" style={{ color: C.sub }}>
              开盘啦热榜 {hotStocks.length > 0 && <span style={{ color: C.dim }}>({hotStocks.length})</span>}
            </div>
            <div className="max-h-[250px] space-y-1.5 overflow-y-auto">
              {hotStocks.slice(0, 15).map((item, i) => {
                const isUp = (item.changePercent ?? 0) >= 0;
                return (
                  <div key={i} className="flex items-center justify-between rounded px-2 py-1.5 text-[11px]"
                    style={{ backgroundColor: C.bg }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-center font-bold" style={{ color: i < 3 ? C.accent : C.dim }}>{i + 1}</span>
                      <span className="font-medium truncate" style={{ color: C.text }}>{item.name ?? ""}</span>
                      <span className="text-[10px]" style={{ color: C.dim }}>{item.code ?? ""}</span>
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
      )}
    </div>
  );
};

export default AIAnalysis;