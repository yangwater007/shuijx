/**
 * 折线图配置工厂
 */

import type { EChartsOption } from "echarts";
import type { LineData } from "./types";

const LINE_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#22c55e", "#8b5cf6"];

interface LineOptions {
  title?: string;
  /** 是否平滑曲线 */
  smooth?: boolean;
  /** 是否显示面积 */
  showArea?: boolean;
}

function getLineOption(data: LineData, options: LineOptions = {}): EChartsOption {
  const { title, smooth = true, showArea = false } = options;

  return {
    title: title
      ? { text: title, left: "center", textStyle: { color: "#f1f5f9", fontSize: 14 } }
      : undefined,
    tooltip: { trigger: "axis" },
    legend: {
      data: data.series.map((s) => s.name),
      top: title ? 30 : 5,
      textStyle: { color: "#94a3b8" },
    },
    grid: { left: "5%", right: "5%", top: title ? 70 : 45, bottom: 30 },
    xAxis: {
      type: "category",
      data: data.categories,
      boundaryGap: false,
    },
    yAxis: { type: "value" },
    color: LINE_COLORS,
    series: data.series.map((s, idx) => ({
      name: s.name,
      type: "line",
      data: s.data,
      smooth,
      symbol: "circle",
      symbolSize: 4,
      lineStyle: { width: 2 },
      areaStyle: showArea
        ? {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${LINE_COLORS[idx % LINE_COLORS.length]}40` },
                { offset: 1, color: "rgba(239,68,68,0)" },
              ],
            },
          }
        : undefined,
    })),
  };
}

export default getLineOption;
