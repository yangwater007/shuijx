/**
 * 资金流向图表配置工厂
 * 涵盖：大盘资金流柱状图、桑基图（板块间资金流）、板块排行柱状图
 */

import type { EChartsOption } from "echarts";
import type { FundFlowData } from "./types";
import { STOCK_UP, STOCK_DOWN } from "@infra/config";

/** 桑基图节点 */
export interface SankeyNode {
  name: string;
  itemStyle?: { color?: string };
}

/** 桑基图边 */
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

/** 板块资金流数据 */
export interface SectorFlowItem {
  name: string;
  changePercent: number;
  stockCnt: number;
  mainInflow?: number;
}

/** 大盘资金流柱状图 */
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
    xAxis: { type: "category", data: dates, axisLabel: { color: "#94a3b8" } },
    yAxis: { type: "value", axisLabel: { color: "#94a3b8" }, splitLine: { lineStyle: { color: "#1e293b" } } },
    series: [
      {
        name: "主力净流入",
        type: "bar",
        stack: "fund",
        data: data.map((d) => d.mainIn - d.mainOut),
        itemStyle: { color: STOCK_UP },
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

/** 板块间资金流向桑基图 */
function getSankeyOption(nodes: SankeyNode[], links: SankeyLink[]): EChartsOption {
  return {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: (params: { name?: string; value?: number; dataType?: string }) => {
        if (params.dataType === "edge") {
          return `${params.name}：${((params.value ?? 0) / 1e8).toFixed(2)}亿`;
        }
        return `${params.name}`;
      },
    },
    series: [
      {
        type: "sankey",
        layout: "none",
        emphasis: { focus: "adjacency" },
        nodeAlign: "left",
        layoutIterations: 0,
        data: nodes,
        links: links,
        label: {
          show: true,
          position: "right",
          color: "#94a3b8",
          fontSize: 11,
        },
        lineStyle: {
          color: "gradient",
          curveness: 0.5,
          opacity: 0.25,
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: "#334155",
        },
      },
    ],
  };
}

/** 板块资金排行柱状图 */
function getSectorBarOption(data: SectorFlowItem[], topN = 15): EChartsOption {
  const top = data.slice(0, topN).reverse();
  const names = top.map((d) => d.name);
  const values = top.map((d) => d.changePercent);

  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]!;
        const item = top.find((d) => d.name === p.name);
        return `${p.name}<br/>涨幅：${p.value > 0 ? "+" : ""}${p.value.toFixed(2)}%<br/>成分股：${item?.stockCnt ?? 0}只`;
      },
    },
    grid: { left: "12%", right: "10%", top: 10, bottom: 20 },
    xAxis: {
      type: "value",
      axisLabel: {
        color: "#94a3b8",
        formatter: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`,
      },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    yAxis: {
      type: "category",
      data: names,
      axisLabel: { color: "#94a3b8", fontSize: 11, width: 80, overflow: "truncate" },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: values.map((v) => ({
          value: v,
          itemStyle: {
            color: v >= 0 ? STOCK_UP : STOCK_DOWN,
            borderRadius: [0, 3, 3, 0],
          },
        })),
        barWidth: 16,
        label: {
          show: true,
          position: "right",
          color: "#94a3b8",
          fontSize: 10,
          formatter: (p: { value: number }) => `${p.value > 0 ? "+" : ""}${p.value.toFixed(2)}%`,
        },
      },
    ],
  };
}

export { getFundFlowOption, getSankeyOption, getSectorBarOption };
export default getFundFlowOption;
