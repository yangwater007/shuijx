/**
 * BoardMultiDay — 多日连板天梯视图
 * 日期×层级网格布局，横向滚动
 */

import { type FC } from "react";
import type { BoardDate, BoardStock } from "@data/models/board.model";
import useMultiDayGrid from "../../hooks/useMultiDayGrid";
import StockCard from "../StockCard/StockCard";

interface Props {
  dates: BoardDate[];
  loading: boolean;
  onStockClick?: (stock: BoardStock) => void;
}

/** 层级颜色（越高越红） */
function getLevelColor(level: number): string {
  if (level >= 7) return "linear-gradient(135deg, #dc2626, #ef4444)";
  if (level >= 5) return "linear-gradient(135deg, #ef4444, #f97316)";
  if (level >= 3) return "linear-gradient(135deg, #f97316, #fb923c)";
  return "linear-gradient(135deg, #fb923c, #fbbf24)";
}

/** 格式化日期显示 */
function formatDateLabel(date: BoardDate): { dateStr: string; dayLabel: string } {
  const m = date.date.slice(4, 6);
  const d = date.date.slice(6, 8);
  return { dateStr: `${m}-${d}`, dayLabel: date.dayOfWeek };
}

const BoardMultiDay: FC<Props> = ({ dates, loading, onStockClick }) => {
  const { dates: sortedDates, levels, grid, firstBoardStocks } = useMultiDayGrid(dates);

  if (loading && dates.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-slate-500">加载中...</p>
      </div>
    );
  }

  if (!loading && dates.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed"
        style={{ borderColor: "var(--board-border)", backgroundColor: "var(--board-card)" }}
      >
        <p className="text-sm text-slate-500">暂无多日数据</p>
      </div>
    );
  }

  const colWidth = 176; // 列宽：卡片宽 156 + 间距

  return (
    <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
      {/* === 表头行：层级标签 + 日期列头 === */}
      <div className="flex border-b" style={{ borderColor: "var(--board-border)" }}>
        {/* 左上角占位 */}
        <div className="flex w-[72px] shrink-0 items-end px-2 pb-2">
          <span className="text-xs font-bold text-slate-400">层级</span>
        </div>

        {/* 日期列头 */}
        <div className="flex overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {sortedDates.map((date) => {
            const { dateStr, dayLabel } = formatDateLabel(date);
            return (
              <div
                key={date.date}
                className="flex w-[176px] shrink-0 flex-col items-center gap-0.5 py-2"
                style={{ borderLeft: "1px solid var(--board-border)" }}
              >
                <span className="text-xs font-bold text-white">
                  {dateStr}
                  <span className="ml-1 text-[11px] font-normal text-slate-400">{dayLabel}</span>
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                >
                  {date.totalStocks}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* === 主体区域 === */}
      <div className="flex">
        {/* 左侧层级标签列 */}
        <div className="w-[72px] shrink-0">
          {levels.map((level) => (
            <div key={level} className="flex items-center justify-end gap-1.5 px-2 py-2 border-b" style={{ borderColor: "var(--board-border)" }}>
              <span className="text-xs text-slate-400">{level}板</span>
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded shadow"
                style={{ background: getLevelColor(level) }}
              >
                <span className="text-xs font-bold text-white">{level}</span>
              </div>
            </div>
          ))}

          {/* 首板标签 */}
          <div className="flex items-center justify-end gap-1.5 px-2 py-2" style={{ borderColor: "var(--board-border)" }}>
            <span className="text-xs text-slate-400">首板</span>
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded shadow"
              style={{ background: "linear-gradient(135deg, #fb923c, #fbbf24)" }}
            >
              <span className="text-xs font-bold text-white">1</span>
            </div>
          </div>
        </div>

        {/* 右侧数据区域（可横向滚动） */}
        <div className="min-w-0 flex-1 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <div style={{ minWidth: sortedDates.length * colWidth }}>
            {/* 各层级行 */}
            {levels.map((level, levelIdx) => (
              <div key={level} className="flex" style={{ minHeight: 36 }}>
                {sortedDates.map((date, dateIdx) => {
                  const cell = grid[levelIdx]?.[dateIdx];
                  const stocks = cell?.stocks ?? [];
                  return (
                    <div
                      key={date.date}
                      className="flex flex-wrap gap-1.5 p-1.5"
                      style={{
                        width: colWidth,
                        borderLeft: "1px solid var(--board-border)",
                        borderBottom: "1px solid var(--board-border)",
                        minHeight: 36,
                      }}
                    >
                      {stocks.map((stock) => (
                        <StockCard
                          key={stock.code}
                          stock={stock}
                          viewType="multi"
                          onClick={onStockClick}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* 首板行 */}
            <div className="flex" style={{ minHeight: 36 }}>
              {sortedDates.map((date, dateIdx) => {
                const stocks = firstBoardStocks[dateIdx] ?? [];
                return (
                  <div
                    key={date.date}
                    className="flex flex-wrap gap-1.5 p-1.5"
                    style={{
                      width: colWidth,
                      borderLeft: "1px solid var(--board-border)",
                      minHeight: 36,
                    }}
                  >
                    {stocks.map((stock) => (
                      <StockCard
                        key={stock.code}
                        stock={stock}
                        viewType="multi"
                        onClick={onStockClick}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoardMultiDay;
