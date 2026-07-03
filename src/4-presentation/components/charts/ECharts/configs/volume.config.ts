/**
 * 成交量柱状图配置工厂
 */

import type { EChartsOption } from "echarts";
import type { VolumeData } from "./types";

function getVolumeOption(data: VolumeData[]): EChartsOption {
  return {
    tooltip: { trigger: "axis" },
    grid: { left: "8%", right: "4%", top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: data.map((d) => d.date),
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (val: number) => {
          if (val >= 10000) return `${(val / 10000).toFixed(1)}万`;
          return `${val}`;
        },
      },
    },
    series: [
      {
        name: "成交量",
        type: "bar",
        data: data.map((d) => ({
          value: d.volume,
          itemStyle: {
            color: d.isUp ? "#ef4444" : "#22c55e",
            borderRadius: [2, 2, 0, 0],
          },
        })),
      },
    ],
  };
}

export default getVolumeOption;
