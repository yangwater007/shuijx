/**
 * MiniTimeshare — 列表视图中的迷你分时图
 * 无坐标轴、无标签，仅显示折线
 */

import { useMemo, type FC } from "react";
import { BaseChart } from "@ui/components/data/charts";
import type { EChartsOption } from "echarts";

interface Props {
  /** 涨跌幅（用于决定线条颜色） */
  changeRate: number;
  /** 高度，默认 36 */
  height?: number;
}

const MiniTimeshare: FC<Props> = ({ changeRate, height = 36 }) => {
  const isUp = changeRate >= 0;
  const lineColor = isUp ? "#ef4444" : "#22c55e";

  const option: EChartsOption = useMemo(() => {
    // 模拟分时：18 个点，从 0 开始，波动到 changeRate
    const points = 18;
    const data: number[] = [];
    

    for (let i = 0; i < points; i++) {
      const progress = i / points;
      // 开盘跳开约一半涨幅，盘中震荡，最终收敛到 changeRate
      const base = changeRate * (0.4 + progress * 0.6);
      const noise = (Math.random() - 0.5) * Math.abs(changeRate) * 0.3;
      data.push(+(base + noise).toFixed(2));
    }

    return {
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { show: false, data: data.map((_, i) => i) },
      yAxis: { show: false, scale: true },
      series: [
        {
          type: "line",
          data,
          smooth: true,
          symbol: "none",
          lineStyle: { color: lineColor, width: 1.2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: isUp ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)" },
                { offset: 1, color: "rgba(239,68,68,0)" },
              ],
            },
          },
        },
      ],
    };
  }, [changeRate, lineColor, isUp]);

  return (
    <div className="flex items-center justify-center" style={{ width: 90, height }}>
      <BaseChart option={option} height={height} width={90} />
    </div>
  );
};

export default MiniTimeshare;
