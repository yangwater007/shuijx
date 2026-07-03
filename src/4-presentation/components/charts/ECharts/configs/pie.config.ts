/**
 * 饼图配置工厂
 */

import type { EChartsOption } from "echarts";
import type { PieDataItem } from "./types";

const PIE_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#22c55e", "#8b5cf6", "#06b6d4", "#ec4899"];

function getPieOption(data: PieDataItem[], title?: string): EChartsOption {
  return {
    title: title
      ? { text: title, left: "center", top: 10, textStyle: { color: "#f1f5f9", fontSize: 14 } }
      : undefined,
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: {
      orient: "vertical",
      right: "5%",
      top: "center",
      textStyle: { color: "#94a3b8", fontSize: 12 },
    },
    color: PIE_COLORS,
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["35%", "55%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#1e293b",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
        },
        data: data.map((d) => ({ name: d.name, value: d.value })),
      },
    ],
  };
}

export default getPieOption;
