/**
 * 图表数据通用类型定义
 */

/** K线数据 */
export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

/** 分时数据点 */
export interface TimesharePoint {
  time: string;
  price: number;
  volume: number;
  avgPrice: number;
}

/** 成交量数据 */
export interface VolumeData {
  date: string;
  volume: number;
  isUp: boolean;
}

/** 资金流向数据 */
export interface FundFlowData {
  date: string;
  mainIn: number;
  mainOut: number;
  retailIn: number;
  retailOut: number;
}

/** 饼图/分类数据 */
export interface PieDataItem {
  name: string;
  value: number;
}

/** 折线图数据 */
export interface LineSeriesItem {
  name: string;
  data: number[];
}

export interface LineData {
  categories: string[];
  series: LineSeriesItem[];
}
