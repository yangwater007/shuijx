/**
 * 表现层 — 连板天梯页面
 */

import { STOCK_UP, BOARD_CARD } from "@infra/config";
import { formatPercent } from "@infra/utils/format";
import useBoardLadder from "@business/board/useBoardLadder";
import PageHeader from "@ui/components/PageHeader";
import type { BoardStock } from "@data/models/board.model";
import type { FC } from "react";

/** 统计卡片 */
const SummaryCard: FC<{
  label: string;
  value: string | number;
  suffix?: string;
}> = ({ label, value, suffix }) => (
  <div
    className="flex flex-col items-center rounded-xl px-6 py-4"
    style={{ backgroundColor: "var(--board-card)" }}
  >
    <span className="text-xs text-slate-400">{label}</span>
    <span className="mt-1 text-2xl font-bold text-white">
      {value}
      {suffix && <span className="ml-1 text-sm font-normal text-slate-400">{suffix}</span>}
    </span>
  </div>
);

/** 股票行 */
const StockRow: FC<{ stock: BoardStock; level: number }> = ({ stock, level }) => {
  const isUp = stock.changeDirection === "up";
  const color = isUp ? STOCK_UP : "#22c55e";

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5"
      style={{ backgroundColor: "var(--board-bg)" }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{stock.name}</span>
          <span className="text-xs text-slate-500">{stock.code}</span>
          <span
            className="rounded px-1.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: color, color: "#fff" }}
          >
            {level}板
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <span>{stock.industry}</span>
          <span>·</span>
          <span>{stock.primaryTheme}</span>
          <span>·</span>
          <span>{stock.limitUpType}</span>
        </div>
      </div>
      <span className="w-16 text-right font-mono text-sm font-bold" style={{ color }}>
        {formatPercent(stock.changeRate)}
      </span>
      <span className="w-20 text-right font-mono text-xs text-slate-400">
        {stock.limitAmount}
      </span>
      {stock.reasonInfo && (
        <span
          className="max-w-[200px] cursor-default truncate rounded px-2 py-0.5 text-xs"
          style={{ backgroundColor: "var(--board-card)", color: "var(--stock-flat)" }}
          title={stock.reasonInfo}
        >
          {stock.reasonInfo}
        </span>
      )}
    </div>
  );
};

const BoardLadder: FC = () => {
  const { levels, summary, loading, refresh } = useBoardLadder();

  return (
    <div>
      <PageHeader title="连板天梯" subtitle="实时展示 A 股连续涨停股票梯队分布">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: "var(--board-card)",
            color: "#e2e8f0",
            border: "1px solid var(--board-border)",
          }}
        >
          {loading ? "刷新中..." : "刷新"}
        </button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <SummaryCard label="最高连板" value={summary.maxLevel} suffix="板" />
        <SummaryCard label="涨停总数" value={summary.totalStocks} suffix="只" />
        <SummaryCard label="梯队层级" value={summary.levelCount} suffix="层" />
        <SummaryCard label="炸板率" value={`${summary.pauseRatio.toFixed(1)}%`} />
      </div>

      {loading && levels.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-slate-500">加载中...</p>
        </div>
      )}

      {!loading && levels.length === 0 && (
        <div
          className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed"
          style={{ borderColor: "var(--board-border)", backgroundColor: BOARD_CARD }}
        >
          <p className="text-slate-500">暂无数据 — 非交易日或数据未更新</p>
        </div>
      )}

      <div className="space-y-4">
        {levels.map((level) => (
          <div
            key={level.level}
            className="rounded-xl p-4"
            style={{ backgroundColor: BOARD_CARD }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className="rounded-lg px-3 py-1 text-sm font-bold text-white"
                style={{ backgroundColor: STOCK_UP }}
              >
                {level.level}板
              </span>
              <span className="text-sm text-slate-400">共 {level.count} 只</span>
            </div>
            <div className="space-y-1.5">
              {level.stocks.map((stock) => (
                <StockRow key={stock.code} stock={stock} level={level.level} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardLadder;
