/**
 * TimeshareChart — 独立可复用的分时图组件
 */

import { useMemo, type FC } from "react";
import BaseChart from "./base/BaseChart";
import type { EChartsOption } from "echarts";
import type { TimeshareDataPoint } from "@infra/types/chart";

// 重新导出类型供外部使用
export type { TimeshareDataPoint };

interface Props {
  data: TimeshareDataPoint[];
  preClose: number;
  height?: number | string;
  loading?: boolean;
  className?: string;
}

const TimeshareChart: FC<Props> = ({ data, preClose, height = 360, loading = false, className }) => {
  const option = useMemo((): EChartsOption => {
    const times = data.map((d) => d.time);
    const prices = data.map((d) => d.price);
    const lastPrice = prices[prices.length - 1] ?? preClose;
    const changePct = preClose > 0 ? ((lastPrice - preClose) / preClose) * 100 : 0;
    const isUp = changePct >= 0;
    const lineColor = isUp ? "#ef4444" : "#22c55e";
    const hasAvg = data.some((d) => d.avgPrice != null);

    const series: EChartsOption["series"] = [
      {
        type: "line",
        name: "价格",
        data: prices,
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1.5, color: lineColor },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isUp ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)" },
              { offset: 1, color: "rgba(239,68,68,0)" },
            ],
          },
        },
      },
    ];

    if (hasAvg) {
      series.push({
        type: "line",
        name: "均价",
        data: data.map((d) => d.avgPrice),
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1, color: "#f59e0b", type: "dashed" },
      });
    }

    return {
      tooltip: { trigger: "axis" },
      grid: { left: "8%", right: "4%", top: 20, bottom: 30 },
      xAxis: { type: "category", data: times, boundaryGap: false },
      yAxis: { type: "value", scale: true },
      series,
    };
  }, [data, preClose]);

  return (
    <BaseChart option={option} height={height} loading={loading}
      showNoData={data.length === 0 && !loading} noDataText="暂无分时数据" className={className} />
  );
};

export default TimeshareChart;
