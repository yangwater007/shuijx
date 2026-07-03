/** 表现层 — 涨跌停徽章组件 */

import { STOCK_UP, STOCK_DOWN } from "@infra/config";
import type { FC } from "react";

interface ChangeBadgeProps {
  /** 涨跌幅百分比 */
  changePct: number;
  /** 是否是涨停 */
  isLimit?: boolean;
}

const ChangeBadge: FC<ChangeBadgeProps> = ({ changePct, isLimit }) => {
  const isUp = changePct > 0;
  const color = isUp ? STOCK_UP : STOCK_DOWN;
  const prefix = isUp ? "+" : "";
  const label = `${prefix}${changePct.toFixed(2)}%`;

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold"
      style={{
        backgroundColor: isLimit ? color : "transparent",
        color: isLimit ? "#fff" : color,
        border: isLimit ? "none" : `1px solid ${color}`,
      }}
    >
      {isLimit ? "涨停" : label}
    </span>
  );
};

export default ChangeBadge;
