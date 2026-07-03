/**
 * Charts 组件模块 — 统一导出
 * 
 * BaseChart 已迁移至 @ui/components/data/charts，此处保留代理导出
 */

export { default as BaseChart } from "@ui/components/data/charts/base/BaseChart";
export type { BaseChartProps } from "@ui/components/data/charts/base/BaseChart";
export { default as useECharts } from "./hooks/useECharts";
export { default as stockDarkTheme, registerStockDarkTheme } from "./themes/stock-dark";
export { default as getCandlestickOption } from "./configs/candlestick.config";
export { default as getTimeshareOption } from "./configs/timeshare.config";
export { default as getVolumeOption } from "./configs/volume.config";
export { default as getFundFlowOption } from "./configs/fundflow.config";
export { default as getPieOption } from "./configs/pie.config";
export { default as getLineOption } from "./configs/line.config";
