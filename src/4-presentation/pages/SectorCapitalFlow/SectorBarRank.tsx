/**
 * 板块资金柱状排行 — 复刻 quicktiny BarChart 模块
 * 展示板块主力净流入 Top/Bottom 排名
 */
import { useMemo, type FC } from "react";
import BaseChart from "@ui/components/charts/ECharts/BaseChart";
import type { SectorCapitalFlowRow } from "@data/dto/sectorCapitalFlow";

interface Props {
  rows: SectorCapitalFlowRow[];
  title?: string;
  topN?: number;
  height?: number;
}

const upColor = "#ef4444";
const downColor = "#22c55e";

const SectorBarRank: FC<Props> = ({ rows, title = "板块资金排行", topN = 15, height = 400 }) => {
  const option = useMemo((): any => {
    const sorted = [...rows].sort((a, b) => b.mainNetAmount - a.mainNetAmount);
    const top = sorted.slice(0, topN);
    const reversed = [...top].reverse();

    return {
      tooltip: {
        trigger: "axis" as const,
        axisPointer: { type: "shadow" as const },
        backgroundColor: "#131a24",
        borderColor: "#1e2a36",
        textStyle: { color: "#e8edf5", fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          return p.name + "<br/>主力净额: " + ((p as any).value / 1e8).toFixed(2) + " 亿";
        },
      },
      grid: { left: 100, right: 30, top: 10, bottom: 30 },
      xAxis: {
        type: "value" as const,
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: {
          color: "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v / 1e8).toFixed(0) + "亿",
        },
        splitLine: { lineStyle: { color: "#1e293b", type: "dashed" as const } },
      },
      yAxis: {
        type: "category" as const,
        data: reversed.map((r) => r.sectorName),
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: { color: "#9aaec9", fontSize: 11, width: 90, overflow: "truncate" },
      },
      series: [
        {
          type: "bar" as const,
          data: reversed.map((r) => ({
            value: r.mainNetAmount,
            itemStyle: {
              color: r.mainNetAmount >= 0 ? upColor : downColor,
              borderRadius: [0, 3, 3, 0],
            },
          })),
          barMaxWidth: 24,
          label: {
            show: true,
            position: "right" as const,
            color: "#9aaec9",
            fontSize: 10,
            formatter: (p: any) => (p.value / 1e8).toFixed(2) + "亿",
          },
        },
      ],
    };
  }, [rows, topN]);

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "#131a24" }}>
      <h3 className="mb-3 text-sm font-bold" style={{ color: "#e8edf5" }}>{title}</h3>
      <BaseChart option={option} height={height} />
    </div>
  );
};

export default SectorBarRank;
