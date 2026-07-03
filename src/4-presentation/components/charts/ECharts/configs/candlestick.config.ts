/**
 * K线图（蜡烛图）配置工厂
 */

import type { EChartsOption } from "echarts";
import type { KLineData } from "./types";

interface CandlestickOptions {
  title?: string;
  /** 是否计算并显示均线 */
  showMA?: boolean;
  /** 均线周期，默认 [5, 10, 20] */
  maList?: number[];
  /** 是否显示成交量副图 */
  showVolume?: boolean;
}

/** 计算移动平均线 */
function calcMA(data: KLineData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j]!.close;
    }
    result.push(+(sum / period).toFixed(2));
  }
  return result;
}

function getCandlestickOption(
  data: KLineData[],
  options: CandlestickOptions = {}
): EChartsOption {
  const { title, showMA = true, maList = [5, 10, 20], showVolume = true } = options;

  const dates = data.map((d) => d.date);
  const ohlc = data.map((d) => [d.open, d.close, d.low, d.high]);
  const volumes = data.map((d) => d.volume);

  const series: EChartsOption["series"] = [
    {
      name: "K线",
      type: "candlestick",
      data: ohlc,
      itemStyle: {
        color: "#ef4444",
        color0: "#22c55e",
        borderColor: "#ef4444",
        borderColor0: "#22c55e",
      },
      // 鼠标悬浮标记线
      markLine: {
        symbol: "none",
        silent: true,
        lineStyle: { color: "#334155", type: "dashed" },
        data: [],
      },
    },
  ];

  // 均线
  if (showMA) {
    const maColors = ["#f59e0b", "#3b82f6", "#8b5cf6"];
    for (let i = 0; i < maList.length; i++) {
      const period = maList[i]!;
      series.push({
        name: `MA${period}`,
        type: "line",
        data: calcMA(data, period),
        smooth: true,
        lineStyle: { width: 1, color: maColors[i % maColors.length] },
        itemStyle: { color: maColors[i % maColors.length] },
        symbol: "none",
      });
    }
  }

  // 成交量副图
  if (showVolume) {
    series.push({
      name: "成交量",
      type: "bar",
      yAxisIndex: 1,
      data: volumes,
      itemStyle: {
        color: (params) => {
          const idx = params.dataIndex;
          const item = data[idx];
          if (!item) return "#22c55e";
          return item.close >= item.open ? "#ef4444" : "#22c55e";
        },
      },
    });
  }

  return {
    title: title
      ? { text: title, left: "center", textStyle: { color: "#f1f5f9", fontSize: 14 } }
      : undefined,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
    },
    grid: [
      { left: "5%", right: "5%", top: title ? 50 : 20, height: showVolume ? "55%" : "75%" },
      { left: "5%", right: "5%", top: "68%", height: "20%" },
    ],
    xAxis: [
      {
        type: "category",
        data: dates,
        gridIndex: 0,
      },
      {
        type: "category",
        data: dates,
        gridIndex: 1,
        show: false,
      },
    ],
    yAxis: [
      { type: "value", gridIndex: 0, scale: true },
      { type: "value", gridIndex: 1 },
    ],
    series,
  };
}

export default getCandlestickOption;
export { calcMA };
