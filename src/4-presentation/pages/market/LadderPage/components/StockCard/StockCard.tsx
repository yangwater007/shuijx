/**
 * StockCard — 股票卡片组件
 * 支持单日/多日/列表三种视图样式
 */

import { useState, type FC, type MouseEvent } from "react";
import type { BoardStock } from "@data/models/board.model";
import { formatPercent, formatAmount } from "@infra/utils/format";

/** 题材颜色池（循环使用） */
const THEME_COLORS = [
  { bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  { bg: "rgba(139,92,246,0.15)", text: "#8b5cf6" },
  { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  { bg: "rgba(34,197,94,0.15)",  text: "#22c55e" },
  { bg: "rgba(6,182,212,0.15)",  text: "#06b6d4" },
  { bg: "rgba(236,72,153,0.15)", text: "#ec4899" },
];

type ViewType = "single" | "multi" | "list";

interface Props {
  stock: BoardStock;
  viewType?: ViewType;
  boardLevel?: number;
  onClick?: (stock: BoardStock) => void;
}

/** 单日视图卡片 */
const SingleCard: FC<{ stock: BoardStock; boardLevel: number; onClick?: (s: BoardStock) => void }> = ({ stock, boardLevel, onClick }) => {
  const isUp = stock.changeDirection === "up";
  const borderColor = isUp ? "var(--stock-up)" : "var(--stock-down)";
  const themeColor = THEME_COLORS[stock.code.length % THEME_COLORS.length]!;

  return (
    <button
      type="button"
      onClick={() => onClick?.(stock)}
      className="group relative flex w-[172px] shrink-0 flex-col gap-2 rounded-xl p-3 text-left transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--board-card)",
        border: `1px solid var(--board-border)`,
      }}
      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLElement).style.borderColor = borderColor;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(239,68,68,0.12)";
      }}
      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--board-border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-sm font-bold text-white">{stock.name}</span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
        >
          {boardLevel}板
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        <span
          className="rounded px-1.5 py-0.5 text-[11px]"
          style={{ backgroundColor: themeColor.bg, color: themeColor.text }}
        >
          {stock.primaryTheme || stock.industry}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{formatAmount(stock.amount)}</span>
        <span
          className="text-xs font-mono font-bold"
          style={{ color: isUp ? "var(--stock-up)" : "var(--stock-down)" }}
        >
          {formatPercent(stock.changeRate)}
        </span>
      </div>
    </button>
  );
};

/** 多日视图卡片 */
const MultiCard: FC<{ stock: BoardStock; onClick?: (s: BoardStock) => void }> = ({ stock, onClick }) => {
  const isUp = stock.changeDirection === "up";
  const borderColor = isUp ? "var(--stock-up)" : "var(--stock-down)";
  const [showReason, setShowReason] = useState(false);
  const themeColor = THEME_COLORS[stock.code.length % THEME_COLORS.length]!;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onClick?.(stock)}
        className="group relative flex w-[156px] shrink-0 flex-col gap-1.5 rounded-xl p-2.5 text-left transition-all hover:-translate-y-0.5"
        style={{
          backgroundColor: "var(--board-card)",
          border: `1px solid var(--board-border)`,
        }}
        onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
          (e.currentTarget as HTMLElement).style.borderColor = borderColor;
        }}
        onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--board-border)";
        }}
      >
        {stock.limitUpType && (
          <span
            className="absolute left-2 top-2 rounded px-1 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: isUp ? "#ef4444" : "#22c55e" }}
          >
            {stock.limitUpType === "一字板" ? "一字" : "换手"}
          </span>
        )}

        <div className="flex items-start justify-between gap-0.5 pt-3">
          <span className="truncate text-xs font-bold text-white">{stock.name}</span>
          <span
            className="shrink-0 text-xs font-mono font-bold"
            style={{ color: isUp ? "var(--stock-up)" : "var(--stock-down)" }}
          >
            {formatPercent(stock.changeRate)}
          </span>
        </div>

        <span
          className="rounded px-1.5 py-0.5 text-[10px]"
          style={{ backgroundColor: themeColor.bg, color: themeColor.text }}
        >
          {stock.primaryTheme || stock.industry}
        </span>

        <span className="text-[11px] text-slate-500">{formatAmount(stock.amount)}</span>
      </button>

      <div className="mt-1 flex gap-1">
        <button
          type="button"
          onClick={(e: MouseEvent) => { e.stopPropagation(); setShowReason(!showReason); }}
          className="flex-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:opacity-80"
          style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
        >
          {showReason ? "收起" : "原因"}
        </button>
        <button
          type="button"
          className="flex-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:opacity-80"
          style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
        >
          解读
        </button>
      </div>

      {showReason && stock.reasonInfo && (
        <div
          className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl p-3 text-xs leading-relaxed shadow-lg"
          style={{ backgroundColor: "var(--board-card)", border: "1px solid var(--board-border)", color: "var(--stock-flat)" }}
        >
          <div className="mb-1 text-[11px] font-bold text-white">涨停原因</div>
          {stock.reasonInfo}
          <button
            type="button"
            onClick={(e: MouseEvent) => { e.stopPropagation(); setShowReason(false); }}
            className="mt-2 text-[10px] underline"
            style={{ color: "var(--stock-up)" }}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
};

/** 列表视图卡片 */
const ListCard: FC<{ stock: BoardStock; onClick?: (s: BoardStock) => void }> = ({ stock, onClick }) => {
  const isUp = stock.changeDirection === "up";

  return (
    <button
      type="button"
      onClick={() => onClick?.(stock)}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
      style={{ backgroundColor: "var(--board-card)" }}
    >
      <span className="w-16 font-mono text-xs text-slate-500">{stock.code}</span>
      <span className="flex-1 font-medium text-white">{stock.name}</span>
      <span className="text-xs text-slate-400">{stock.primaryTheme}</span>
      <span className="w-16 text-right font-mono text-xs font-bold" style={{ color: isUp ? "var(--stock-up)" : "var(--stock-down)" }}>
        {formatPercent(stock.changeRate)}
      </span>
      <span className="w-16 text-right text-xs text-slate-500">{formatAmount(stock.amount)}</span>
    </button>
  );
};

const StockCard: FC<Props> = ({ stock, viewType = "single", boardLevel, onClick }) => {
  if (viewType === "multi") {
    return <MultiCard stock={stock} onClick={onClick} />;
  }
  if (viewType === "list") {
    return <ListCard stock={stock} onClick={onClick} />;
  }
  return <SingleCard stock={stock} boardLevel={boardLevel ?? stock.continueNum} onClick={onClick} />;
};

export default StockCard;
export type { ViewType };

