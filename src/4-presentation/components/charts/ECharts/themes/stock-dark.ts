/**
 * 股票深色主题 — ECharts 主题配置
 */

/** 主题色板 */
const COLOR_PALETTE = {
  up: "#ef4444",
  down: "#22c55e",
  blue: "#3b82f6",
  orange: "#f59e0b",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  pink: "#ec4899",
};

/** 文本颜色 */
const TEXT_COLORS = {
  primary: "#f1f5f9",
  secondary: "#94a3b8",
  muted: "#64748b",
};

/** 边框/分割线 */
const BORDER_COLORS = {
  line: "#334155",
  split: "#1e293b",
};

const stockDarkTheme: Record<string, unknown> = {
  color: Object.values(COLOR_PALETTE),
  backgroundColor: "transparent",
  textStyle: { color: TEXT_COLORS.secondary },
  title: {
    textStyle: { color: TEXT_COLORS.primary },
    subtextStyle: { color: TEXT_COLORS.secondary },
  },
  legend: { textStyle: { color: TEXT_COLORS.secondary } },
  tooltip: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderColor: BORDER_COLORS.line,
    textStyle: { color: TEXT_COLORS.primary },
  },
  grid: { top: 50, right: 20, bottom: 30, left: 60 },
  categoryAxis: {
    axisLine: { lineStyle: { color: BORDER_COLORS.line } },
    axisTick: { lineStyle: { color: BORDER_COLORS.line } },
    axisLabel: { color: TEXT_COLORS.secondary },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: TEXT_COLORS.secondary },
    splitLine: { lineStyle: { color: BORDER_COLORS.split, type: "dashed" } },
  },
  axisPointer: { lineStyle: { color: BORDER_COLORS.line, type: "dashed" } },
  dataZoom: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    dataBackground: {
      lineStyle: { color: TEXT_COLORS.muted },
      areaStyle: { color: "rgba(100, 116, 139, 0.1)" },
    },
    selectedDataBackground: {
      lineStyle: { color: COLOR_PALETTE.up },
      areaStyle: { color: "rgba(239, 68, 68, 0.15)" },
    },
    textStyle: { color: TEXT_COLORS.secondary },
    handleStyle: { color: TEXT_COLORS.secondary },
  },
  candlestick: {
    itemStyle: {
      color: COLOR_PALETTE.up,
      color0: COLOR_PALETTE.down,
      borderColor: COLOR_PALETTE.up,
      borderColor0: COLOR_PALETTE.down,
    },
  },
};

function registerStockDarkTheme(echartsModule: {
  registerTheme: (name: string, theme: Record<string, unknown>) => void;
}): void {
  echartsModule.registerTheme("stock-dark", stockDarkTheme);
}

export default stockDarkTheme;
export { COLOR_PALETTE, TEXT_COLORS, BORDER_COLORS, registerStockDarkTheme };
