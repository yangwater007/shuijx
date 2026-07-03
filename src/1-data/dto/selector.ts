/** 数据层 — 条件选股 DTO 类型 */

import type { Stock, ApiResponse } from "@infra/types/stock";

/** 选股筛选条件 */
export interface SelectorCriteria {
  /** 概念/题材关键词 */
  concept?: string;
  /** 最小涨跌幅（%） */
  minChangePct?: number;
  /** 最大涨跌幅（%） */
  maxChangePct?: number;
  /** 最小量比 */
  minVolumeRatio?: number;
  /** 均线形态：above=站上均线, below=跌破均线 */
  maPattern?: "above" | "below";
  /** 均线周期（5/10/20/60 日） */
  maPeriod?: 5 | 10 | 20 | 60;
  /** 最低股价 */
  minPrice?: number;
  /** 最高股价 */
  maxPrice?: number;
  /** 排序字段 */
  sortBy?: "changePct" | "volume" | "price";
  /** 排序方向 */
  sortOrder?: "asc" | "desc";
}

/** 后端选股响应 */
export interface SelectorResponse extends ApiResponse<Stock[]> {}

/** 重组后的选股结果 */
export interface SelectorResult {
  stocks: Stock[];
  total: number;
  criteria: SelectorCriteria;
  updatedAt: number;
}
