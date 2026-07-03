/**
 * QuadrantChart — 板块象限散点图
 * X轴: 近N日涨幅(强弱) | Y轴: M日强度(高低)
 */

import { useMemo, type FC } from "react";
import BaseChart from "@ui/components/data/charts/base/BaseChart";
import type { EChartsOption } from "echarts";
import type { SectorQuadrantItem } from "@data/dto/sector";

interface Props {
  quadrants: {
    highStrong: SectorQuadrantItem[];
    highWeak: SectorQuadrantItem[];
    lowStrong: SectorQuadrantItem[];
    lowWeak: SectorQuadrantItem[];
  };
  periodLabel: string;
  strengthLabel: string;
  height?: number | string;
  loading?: boolean;
}

const QUADRANT_CONFIG = [
  { key: "highStrong" as const, name: "领涨", color: "#ef4444", symbol: "circle" },
  { key: "highWeak" as const, name: "补涨", color: "#f59e0b", symbol: "diamond" },
  { key: "lowStrong" as const, name: "滞涨", color: "#3b82f6", symbol: "triangle" },
  { key: "lowWeak" as const, name: "领跌", color: "#22c55e", symbol: "rect" },
];

function buildScatterSeries(q: Props["quadrants"]): EChartsOption["series"] {
  return QUADRANT_CONFIG.map((cfg) => ({
    name: cfg.name,
    type: "scatter" as const,
    symbol: cfg.symbol,
    symbolSize: 14,
    data: q[cfg.key].map((d) => ({
      value: [d.recentChange, d.periodChange],
      name: d.name,
      stockCount: d.stockCount,
      todayChange: d.todayChange,
      volumeRatio: d.volumeRatio,
    })),
    itemStyle: { color: cfg.color, opacity: 0.88 },
    emphasis: {
      scale: 2.0,
      itemStyle: { opacity: 1, shadowBlur: 10, shadowColor: cfg.color },
    },
    label: {
      show: true,
      position: "right",
      fontSize: 10,
      color: "#94a3b8",
      formatter: (p: unknown) => (p as { name?: string }).name ?? "",
    },
    markLine: {
      silent: true,
      symbol: "none",
      lineStyle: { type: "dashed", color: "#334155", width: 1 },
      data: [{ xAxis: 0, label: { show: false } }, { yAxis: 0, label: { show: false } }],
    },
  }));
}

const QuadrantChart: FC<Props> = ({
  quadrants, periodLabel, strengthLabel, height = 500, loading = false,
}) => {
  const option: EChartsOption = useMemo(() => ({
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.96)",
      borderColor: "#334155",
      textStyle: { color: "#f1f5f9", fontSize: 12 },
      formatter: (rawParams: unknown) => {
        const p = rawParams as {
          value: number[]; name: string; seriesName: string;
          data?: { stockCount?: number; todayChange?: number; volumeRatio?: number };
        };
        if (!p?.value) return "";
        const d = p.data ?? {};
        const td = d.todayChange ?? 0;
        const todayStr = td >= 0 ? `+${td.toFixed(2)}%` : `${td.toFixed(2)}%`;
        const todayColor = td >= 0 ? "#ef4444" : "#22c55e";
        const r0 = p.value[0] ?? 0;
        const r1 = p.value[1] ?? 0;
        return `<div style="font-size:14px;font-weight:bold;margin-bottom:6px">${p.name}</div>
          <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">
            <span>${periodLabel}涨幅</span><span style="color:${r0 >= 0 ? "#ef4444" : "#22c55e"}">${r0.toFixed(2)}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">
            <span>${strengthLabel}强度</span><span style="color:${r1 >= 0 ? "#ef4444" : "#22c55e"}">${r1.toFixed(2)}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px;margin-top:2px">
            <span>今日涨跌</span><span style="color:${todayColor}">${todayStr}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">
            <span>量比</span><span style="color:#94a3b8">${(d.volumeRatio ?? 0).toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:16px;font-size:12px">
            <span>成分股</span><span style="color:#94a3b8">${d.stockCount ?? 0} 只</span>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">象限: ${p.seriesName}</div>`;
      },
    },
    grid: { left: 60, right: 30, top: 45, bottom: 55 },
    xAxis: {
      name: `${periodLabel}涨幅 (%)`,
      nameLocation: "center",
      nameGap: 30,
      nameTextStyle: { color: "#94a3b8", fontSize: 11 },
      type: "value",
      axisLine: { lineStyle: { color: "#334155" } },
      axisLabel: { color: "#64748b", formatter: (v: number) => `${v.toFixed(1)}%` },
      splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
      scale: true,
    },
    yAxis: {
      name: `${strengthLabel}强度 (%)`,
      nameLocation: "center",
      nameGap: 40,
      nameTextStyle: { color: "#94a3b8", fontSize: 11 },
      type: "value",
      axisLine: { lineStyle: { color: "#334155" } },
      axisLabel: { color: "#64748b", formatter: (v: number) => `${v.toFixed(1)}%` },
      splitLine: { lineStyle: { color: "#1e293b", type: "dashed" } },
      scale: true,
    },
    series: buildScatterSeries(quadrants),
    legend: {
      data: QUADRANT_CONFIG.map((c) => c.name),
      textStyle: { color: "#94a3b8", fontSize: 11 },
      icon: "circle",
      bottom: 8,
      itemGap: 24,
    },
  }), [quadrants, periodLabel, strengthLabel]);

  const isEmpty =
    !loading &&
    quadrants.highStrong.length === 0 &&
    quadrants.highWeak.length === 0 &&
    quadrants.lowStrong.length === 0 &&
    quadrants.lowWeak.length === 0;

  return (
    <BaseChart
      option={option}
      height={height}
      loading={loading}
      showNoData={isEmpty}
      noDataText="暂无板块数据 — 请检查数据源或刷新重试"
    />
  );
};

export default QuadrantChart;
