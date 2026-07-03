/**
 * 股票深色主题 — ECharts 主题配置
 * 用于所有图表组件的默认主题
 *
 * 使用方式：
 *   import { registerStockDarkTheme } from "./stock-dark-theme";
 *   // 在应用初始化时调用一次
 *   import * as echarts from "echarts";
 *   registerStockDarkTheme(echarts);
 */

/** 主题色板 */
export const CHART_COLORS = {
  up: "#ef4444",
  down: "#22c55e",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  pink: "#ec4899",
} as const;

/** 文本颜色 */
export const CHART_TEXT = {
  primary: "#f1f5f9",
  secondary: "#94a3b8",
  muted: "#64748b",
} as const;

/** 边框/分割线 */
export const CHART_BORDER = {
  line: "#334155",
  split: "#1e293b",
} as const;

const stockDarkTheme: Record<string, unknown> = {
  color: Object.values(CHART_COLORS),
  backgroundColor: "transparent",
  textStyle: { color: CHART_TEXT.secondary },
  title: {
    textStyle: { color: CHART_TEXT.primary },
    subtextStyle: { color: CHART_TEXT.secondary },
  },
  legend: { textStyle: { color: CHART_TEXT.secondary } },
  tooltip: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderColor: CHART_BORDER.line,
    textStyle: { color: CHART_TEXT.primary },
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: CHART_BORDER.line } },
    axisTick: { lineStyle: { color: CHART_BORDER.line } },
    axisLabel: { color: CHART_TEXT.secondary },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: CHART_TEXT.secondary },
    splitLine: { lineStyle: { color: CHART_BORDER.split, type: "dashed" } },
  },
  axisPointer: { lineStyle: { color: CHART_BORDER.line, type: "dashed" } },
  dataZoom: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    dataBackground: {
      lineStyle: { color: CHART_TEXT.muted },
      areaStyle: { color: "rgba(100, 116, 139, 0.1)" },
    },
    selectedDataBackground: {
      lineStyle: { color: CHART_COLORS.up },
      areaStyle: { color: "rgba(239, 68, 68, 0.15)" },
    },
    textStyle: { color: CHART_TEXT.secondary },
    handleStyle: { color: CHART_TEXT.secondary },
  },
  candlestick: {
    itemStyle: {
      color: CHART_COLORS.up,
      color0: CHART_COLORS.down,
      borderColor: CHART_COLORS.up,
      borderColor0: CHART_COLORS.down,
    },
  },
};

/**
 * 向 ECharts 注册"stock-dark"主题
 * @param echartsModule echarts 模块实例
 */
export function registerStockDarkTheme(echartsModule: {
  registerTheme: (name: string, theme: Record<string, unknown>) => void;
}): void {
  echartsModule.registerTheme("stock-dark", stockDarkTheme);
}

export default stockDarkTheme;
