/**
 * 基础设施层 — 图表数据类型
 * 纯数据契约，不依赖任何 UI 或渲染层
 */

/** K线数据点（OHLC + 成交量） */
export interface KLineDataPoint {
  /** 日期（YYYY-MM-DD） */
  date: string;
  /** 开盘价 */
  open: number;
  /** 收盘价 */
  close: number;
  /** 最高价 */
  high: number;
  /** 最低价 */
  low: number;
  /** 成交量（手） */
  volume?: number;
}

/** 分时数据点 */
export interface TimeshareDataPoint {
  /** 时间（HH:mm 或 YYYY-MM-DD HH:mm） */
  time: string;
  /** 当前价 */
  price: number;
  /** 均价 */
  avgPrice?: number;
  /** 成交量 */
  volume?: number;
}

/** 分时图完整数据（含昨收） */
export interface TimeshareData {
  /** 分时数据点数组 */
  data: TimeshareDataPoint[];
  /** 昨日收盘价 */
  preClose: number;
}

/** K线接口返回的原始格式 */
export interface KLineRawResponse {
  data?: {
    code: string;
    name: string;
    klines?: string[];
    preKPrice?: number;
  };
}

/** 分时接口返回的原始格式 */
export interface TimeshareRawResponse {
  data?: {
    trends?: string[];
    preClose?: number;
  };
}
