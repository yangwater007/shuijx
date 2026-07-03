/** 表现层 — 热度进度条组件 */

import { STOCK_UP } from "@infra/config";
import type { FC } from "react";

interface HotRankBarProps {
  heat: number;
  maxHeat: number;
}

const HotRankBar: FC<HotRankBarProps> = ({ heat, maxHeat }) => {
  const ratio = maxHeat > 0 ? (heat / maxHeat) * 100 : 0;

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: "var(--board-border)" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${ratio}%`,
          backgroundColor: STOCK_UP,
          opacity: 0.3 + (ratio / 100) * 0.7,
        }}
      />
    </div>
  );
};

export default HotRankBar;
