/** 表现层 — 股票标签组件 */

import { formatPercent } from "@infra/utils/format";
import { STOCK_UP, STOCK_DOWN, STOCK_FLAT } from "@infra/config";
import type { FC } from "react";

interface StockTagProps {
  code: string;
  name: string;
  changePct: number;
  /** 可选的连板数标签 */
  boardCount?: number;
  onClick?: (code: string) => void;
}

/** 根据涨跌幅获取颜色 */
function getColor(pct: number): string {
  if (pct > 0) return STOCK_UP;
  if (pct < 0) return STOCK_DOWN;
  return STOCK_FLAT;
}

const StockTag: FC<StockTagProps> = ({
  code,
  name,
  changePct,
  boardCount,
  onClick,
}) => {
  const color = getColor(changePct);

  const handleClick = () => {
    onClick?.(code);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors hover:opacity-80"
      style={{
        backgroundColor: "var(--board-card)",
        border: "1px solid var(--board-border)",
        color: "#e2e8f0",
      }}
      title={`${name}(${code}) 涨跌幅: ${formatPercent(changePct)}`}
    >
      <span className="font-medium">{name}</span>
      <span className="text-xs opacity-60">{code}</span>
      {boardCount !== undefined && boardCount > 0 && (
        <span
          className="ml-0.5 rounded-sm px-1 text-xs font-bold"
          style={{ backgroundColor: color, color: "#fff" }}
        >
          {boardCount}板
        </span>
      )}
      <span style={{ color }} className="text-xs font-medium">
        {formatPercent(changePct)}
      </span>
    </button>
  );
};

export default StockTag;
export { getColor };
