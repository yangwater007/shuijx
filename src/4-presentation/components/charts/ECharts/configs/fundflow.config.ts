/**
 * 资金流向图配置工厂
 */

import type { EChartsOption } from "echarts";
import type { FundFlowData } from "./types";

function getFundFlowOption(data: FundFlowData[]): EChartsOption {
  const dates = data.map((d) => d.date);

  return {
    tooltip: { trigger: "axis" },
    legend: {
      data: ["主力净流入", "散户净流入"],
      top: 0,
      textStyle: { color: "#94a3b8" },
    },
    grid: { left: "8%", right: "4%", top: 40, bottom: 30 },
    xAxis: { type: "category", data: dates },
    yAxis: { type: "value" },
    series: [
      {
        name: "主力净流入",
        type: "bar",
        stack: "fund",
        data: data.map((d) => d.mainIn - d.mainOut),
        itemStyle: { color: "#ef4444" },
      },
      {
        name: "散户净流入",
        type: "bar",
        stack: "fund",
        data: data.map((d) => d.retailIn - d.retailOut),
        itemStyle: { color: "#3b82f6" },
      },
    ],
  };
}

export default getFundFlowOption;
