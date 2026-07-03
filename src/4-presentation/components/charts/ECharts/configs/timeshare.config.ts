/**
 * 分时图配置工厂
 */

import type { EChartsOption } from "echarts";
import type { TimesharePoint } from "./types";

function getTimeshareOption(
  data: TimesharePoint[],
  preClose: number
): EChartsOption {
  const times = data.map((d) => d.time);
  const prices = data.map((d) => d.price);
  const avgPrices = data.map((d) => d.avgPrice);

  const lastPrice = prices[prices.length - 1] ?? preClose;
  const changePct = ((lastPrice - preClose) / preClose) * 100;
  const up = changePct >= 0;

  return {
    tooltip: { trigger: "axis" },
    grid: { left: "8%", right: "4%", top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: times,
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      scale: true,
    },
    series: [
      {
        name: "价格",
        type: "line",
        data: prices,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1.5, color: up ? "#ef4444" : "#22c55e" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: up ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)" },
              { offset: 1, color: "rgba(239,68,68,0)" },
            ],
          },
        },
      },
      {
        name: "均价",
        type: "line",
        data: avgPrices,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1, color: "#f59e0b", type: "dashed" as const },
      },
    ],
  };
}

export default getTimeshareOption;
