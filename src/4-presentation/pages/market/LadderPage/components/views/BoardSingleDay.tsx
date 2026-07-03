/**
 * BoardSingleDay — 单日连板天梯视图
 * 按层级纵向排列，每层横向滚动股票卡片，底部首板涨停区
 */

import { type FC } from "react";
import type { BoardLevel } from "@data/models/board.model";
import StockCard from "../StockCard/StockCard";

interface Props {
  levels: BoardLevel[];
  selectedTheme: string | null;
  loading: boolean;
  onStockClick?: (stock: Parameters<typeof StockCard>[0]["stock"]) => void;
}

/**
 * 根据连板层级计算方块颜色（越高越红）
 */
function getLevelColor(level: number): string {
  if (level >= 7) return "linear-gradient(135deg, #dc2626, #ef4444)";
  if (level >= 5) return "linear-gradient(135deg, #ef4444, #f97316)";
  if (level >= 3) return "linear-gradient(135deg, #f97316, #fb923c)";
  return "linear-gradient(135deg, #fb923c, #fbbf24)";
}

/**
 * 按题材过滤层级数据
 */
function filterByTheme(levels: BoardLevel[], theme: string | null): BoardLevel[] {
  if (!theme) return levels;
  return levels
    .map((lv) => ({
      ...lv,
      stocks: lv.stocks.filter((s) => s.primaryTheme === theme),
      count: lv.stocks.filter((s) => s.primaryTheme === theme).length,
    }))
    .filter((lv) => lv.count > 0);
}

/**
 * 层级行组件
 */
const LevelRow: FC<{
  level: BoardLevel;
  onStockClick?: Props["onStockClick"];
}> = ({ level, onStockClick }) => {
  const bgGradient = getLevelColor(level.level);

  return (
    <div className="mb-4">
      {/* 层级头部 */}
      <div className="mb-2 flex items-center gap-2">
        {/* 层级方块 */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-lg"
          style={{ background: bgGradient }}
        >
          <span className="text-base font-bold text-white">{level.level}</span>
        </div>
        {/* 股票数量 */}
        <span className="text-xs text-slate-400">{level.count}只</span>
      </div>

      {/* 股票卡片横向滚动区 */}
      <div
        className="flex gap-2.5 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {level.stocks.map((stock) => (
          <StockCard
            key={stock.code}
            stock={stock}
            viewType="single"
            boardLevel={level.level}
            onClick={onStockClick}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * 首板涨停区组件
 */
const FirstBoardSection: FC<{
  stocks: BoardLevel["stocks"];
  onStockClick?: Props["onStockClick"];
}> = ({ stocks, onStockClick }) => {
  if (stocks.length === 0) return null;

  return (
    <div className="mt-6">
      {/* 标题 */}
      <div className="mb-3 flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--board-border)" }}>
        <span className="text-base font-bold text-white">首板涨停</span>
        <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--stock-up)", color: "#fff" }}>
          {stocks.length}
        </span>
      </div>

      {/* 卡片网格（首板多，用网格而非横向滚动） */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {stocks.map((stock) => (
          <StockCard
            key={stock.code}
            stock={stock}
            viewType="single"
            boardLevel={1}
            onClick={onStockClick}
          />
        ))}
      </div>
    </div>
  );
};

const BoardSingleDay: FC<Props> = ({ levels, selectedTheme, loading, onStockClick }) => {
  // 按题材过滤
  const filtered = filterByTheme(levels, selectedTheme);

  // 分离首板（level === 1）和高板
  const highBoards = filtered.filter((lv) => lv.level > 1);
  const firstBoard = filtered.find((lv) => lv.level === 1);

  return (
    <div>
      {/* 加载态 */}
      {loading && filtered.length === 0 && (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-slate-500">加载中...</p>
        </div>
      )}

      {/* 空数据态 */}
      {!loading && filtered.length === 0 && (
        <div
          className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed"
          style={{ borderColor: "var(--board-border)", backgroundColor: "var(--board-card)" }}
        >
          <p className="text-sm text-slate-500">
            {selectedTheme ? `题材「${selectedTheme}」暂无涨停股票` : "暂无数据"}
          </p>
        </div>
      )}

      {/* 高板层级（≥2板）：纵向排列，每层横向滚动 */}
      {highBoards.map((level) => (
        <LevelRow key={level.level} level={level} onStockClick={onStockClick} />
      ))}

      {/* 首板涨停区 */}
      {firstBoard && (
        <FirstBoardSection stocks={firstBoard.stocks} onStockClick={onStockClick} />
      )}
    </div>
  );
};

export default BoardSingleDay;
