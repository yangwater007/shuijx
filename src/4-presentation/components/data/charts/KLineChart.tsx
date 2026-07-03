/**
 * KLineChart — 独立可复用的K线图组件
 * 传入 OHLC 数据即可渲染，不依赖任何业务层
 */

import { useMemo, type FC } from "react";
import BaseChart from "./base/BaseChart";
import type { EChartsOption } from "echarts";
import type { KLineDataPoint } from "@infra/types/chart";

// 重新导出类型供外部使用
export type { KLineDataPoint };

interface Props {
  /** K线数据 */
  data: KLineDataPoint[];
  /** 图表高度 */
  height?: number | string;
  /** 是否显示均线 */
  showMA?: boolean;
  /** 均线周期，默认 [5, 10, 20] */
  maPeriods?: number[];
  /** 是否显示成交量副图 */
  showVolume?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 标题 */
  title?: string;
  /** 类名 */
  className?: string;
}

/** 计算移动平均线 */
function calcMA(data: KLineDataPoint[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j]!.close;
    result.push(+(sum / period).toFixed(2));
  }
  return result;
}

const KLineChart: FC<Props> = ({
  data,
  height = 400,
  showMA = true,
  maPeriods = [5, 10, 20],
  showVolume = true,
  loading = false,
  title,
  className,
}) => {
  const option: EChartsOption = useMemo(() => {
    const dates = data.map((d) => d.date);
    const ohlc = data.map((d) => [d.open, d.close, d.low, d.high] as [number, number, number, number]);
    const volumes = data.map((d) => d.volume ?? 0);
    const hasVolume = showVolume && volumes.some((v) => v > 0);

    const series: EChartsOption["series"] = [
      {
        name: "K线",
        type: "candlestick",
        data: ohlc,
        itemStyle: { color: "#ef4444", color0: "#22c55e", borderColor: "#ef4444", borderColor0: "#22c55e" },
      },
    ];

    if (showMA) {
      const colors = ["#f59e0b", "#3b82f6", "#8b5cf6"];
      maPeriods.forEach((p, i) => {
        series.push({
          name: `MA${p}`,
          type: "line",
          data: calcMA(data, p),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 1, color: colors[i % colors.length] },
        });
      });
    }

    if (hasVolume) {
      series.push({
        name: "成交量",
        type: "bar",
        yAxisIndex: 1,
        data: volumes.map((v, i) => ({
          value: v,
          itemStyle: { color: (data[i]!.close >= data[i]!.open) ? "#ef4444" : "#22c55e" },
        })),
      });
    }

    return {
      title: title ? { text: title, left: "center", textStyle: { color: "#f1f5f9", fontSize: 14 } } : undefined,
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      grid: [
        { left: "5%", right: "5%", top: title ? 50 : 20, height: hasVolume ? "55%" : "75%" },
        ...(hasVolume ? [{ left: "5%", right: "5%", top: "68%", height: "20%" }] : []),
      ],
      xAxis: [
        { type: "category", data: dates, gridIndex: 0 },
        ...(hasVolume ? [{ type: "category", data: dates, gridIndex: 1, show: false } as const] : []),
      ],
      yAxis: [
        { type: "value", gridIndex: 0, scale: true },
        ...(hasVolume ? [{ type: "value", gridIndex: 1 } as const] : []),
      ],
      series,
    };
  }, [data, showMA, maPeriods, showVolume, title]);

  return (
    <BaseChart
      option={option}
      height={height}
      loading={loading}
      showNoData={data.length === 0 && !loading}
      noDataText="暂无K线数据"
      className={className}
    />
  );
};

export default KLineChart;
