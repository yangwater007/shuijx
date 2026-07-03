/**
 * VolumeChart — 独立成交量柱状图组件
 * 传入交易量数据即可渲染
 */

import { useMemo, type FC } from "react";
import BaseChart from "./base/BaseChart";
import type { EChartsOption } from "echarts";

/** 成交量数据点 */
export interface VolumeDataPoint {
  /** 日期 */
  date: string;
  /** 成交量 */
  volume: number;
  /** 是否为上涨日 */
  isUp: boolean;
}

interface Props {
  data: VolumeDataPoint[];
  height?: number | string;
  loading?: boolean;
  className?: string;
}

const VolumeChart: FC<Props> = ({ data, height = 200, loading = false, className }) => {
  const option: EChartsOption = useMemo(() => ({
    tooltip: { trigger: "axis" },
    grid: { left: "8%", right: "4%", top: 10, bottom: 20 },
    xAxis: { type: "category", data: data.map((d) => d.date) },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (val: number) => (val >= 10000 ? `${(val / 10000).toFixed(1)}万` : `${val}`),
      },
    },
    series: [{
      name: "成交量",
      type: "bar",
      data: data.map((d) => ({
        value: d.volume,
        itemStyle: { color: d.isUp ? "#ef4444" : "#22c55e", borderRadius: [2, 2, 0, 0] },
      })),
    }],
  }), [data]);

  return (
    <BaseChart
      option={option}
      height={height}
      loading={loading}
      showNoData={data.length === 0 && !loading}
      noDataText="暂无成交量数据"
      className={className}
    />
  );
};

export default VolumeChart;
