/**
 * 板块资金时序图 — 复刻 quicktiny 折线趋势图
 * 展示板块多日主力资金走向
 */
import { useMemo, type FC } from "react";
import BaseChart from "@ui/components/charts/ECharts/BaseChart";
import type { SectorCapitalFlowTimelinePoint } from "@data/dto/sectorCapitalFlow";

interface Props {
  title: string;
  data: SectorCapitalFlowTimelinePoint[];
  height?: number;
  loading?: boolean;
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f6b26b", "#a855f7"];

const SectorTimelineChart: FC<Props> = ({ title, data, height = 300, loading }) => {
  const option = useMemo((): any => {
    if (!data || data.length === 0) return {};

    // Group by sector
    const sectorMap: Record<string, SectorCapitalFlowTimelinePoint[]> = {};
    for (const p of data) { if (!p || !p.sectorCode) continue;
      const sc = p.sectorCode;
      if (!sectorMap[sc]) sectorMap[sc] = [];
      sectorMap[sc].push(p);
    }

    // Get unique times (x-axis)
    const allTimes = [...new Set(data.filter(Boolean).map((p: any) => p.time))].sort();

    const series = Object.entries(sectorMap)
      .slice(0, 5)
      .map(([, points], i) => {
        const timeMap: Record<string, number> = {};
        for (const p of points) {
          timeMap[p.time] = p.mainNetAmount;
        }
        return {
          name: points[0]?.sectorName || "板块" + (i + 1),
          type: "line" as const,
          smooth: true,
          symbol: "circle" as const,
          symbolSize: 4,
          lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
          itemStyle: { color: COLORS[i % COLORS.length] },
          areaStyle: {
            color: {
              type: "linear" as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: COLORS[i % COLORS.length] + "30" },
                { offset: 1, color: COLORS[i % COLORS.length] + "05" },
              ],
            },
          },
          data: allTimes.map((t) => timeMap[t] ?? null),
        };
      });

    return {
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "#131a24",
        borderColor: "#1e2a36",
        textStyle: { color: "#e8edf5", fontSize: 12 },
        formatter: (params: any) => {
          return params
            .filter((p: any) => p.value != null)
            .map((p: any) => {
              const amt = (p.value / 1e8).toFixed(2);
              return '<span style="color:' + p.color + '">●</span> ' + p.seriesName + ": " + amt + " 亿";
            })
            .join("<br/>");
        },
      },
      legend: {
        data: series.map((s) => s.name),
        textStyle: { color: "#9aaec9", fontSize: 11 },
        top: 0,
      },
      grid: { left: 60, right: 30, top: 40, bottom: 30 },
      xAxis: {
        type: "category" as const,
        data: allTimes,
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: { color: "#64748b", fontSize: 10, rotate: 30 },
      },
      yAxis: {
        type: "value" as const,
        axisLine: { lineStyle: { color: "#334155" } },
        axisLabel: {
          color: "#64748b",
          fontSize: 10,
          formatter: (v: number) => (v / 1e8).toFixed(1) + "亿",
        },
        splitLine: { lineStyle: { color: "#1e293b", type: "dashed" as const } },
      },
      series,
    };
  }, [data]);

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "#131a24" }}>
      <h3 className="mb-3 text-sm font-bold" style={{ color: "#e8edf5" }}>{title}</h3>
      {loading ? (
        <div className="flex items-center justify-center text-sm" style={{ height, color: "#6b7280" }}>
          加载中...
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center text-sm" style={{ height, color: "#6b7280" }}>
          暂无趋势数据
        </div>
      ) : (
        <BaseChart option={option} height={height} />
      )}
    </div>
  );
};

export default SectorTimelineChart;
