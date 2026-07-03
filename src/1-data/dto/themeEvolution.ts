/** 数据层 — 题材演化 DTO 类型 */

import type { ApiResponse } from "@infra/types/stock";
import type { ThemeEvoNode, EvoPath, EvoChildType, EvoStock } from "@infra/types/themeEvolution";

/** API 返回的原始个股数据 */
export interface RawEvoStock {
  _id: string;
  date: string;
  code: string;
  name: string;
  market_id: number;
  market_type: string;
  industry: string;
  main_business: string;
  business_scope: string;
  first_limit_up_time: string;
  last_limit_up_time: string;
  limit_up_type: string;
  open_num: string | null;
  continue_num: number;
  high_days: string;
  high_days_value: number;
  latest: number;
  change_rate: number;
  currency_value: number;
  turnover_rate: number;
  total_market_cap: number;
  actual_currency_value: number;
  actual_turnover_rate: number;
  order_volume: number;
  order_amount: number;
  trading_amount: number;
  reason_type: string;
  reason_info: string;
  jiuyangongshe_category_name: string;
  jiuyangongshe_analysis: string;
  limit_up_suc_rate: number;
  is_again_limit: number;
  is_new: number;
  change_tag: string;
  __v: number;
  createdAt: string;
  updatedAt: string;
}

/** API 返回的原始题材演化子项 */
export interface RawThemeEvoChild {
  type: EvoChildType;
  label: string;
  stock_count: number;
  stocks: RawEvoStock[];
}

/** API 返回的原始题材演化节点（桑基图节点） */
export interface RawThemeEvoNode {
  id: string;
  name: string;
  layer: number;
  amount: number;
  stockCount: number;
  type: EvoChildType;
  stocks: RawEvoStock[];
}

/** API 返回的原始发酵路径步骤 */
export interface RawEvoStep {
  id: string;
  label: string;
  theme: string;
  child_type: EvoChildType;
  stock_count: number;
  stocks: RawEvoStock[];
}

/** API 返回的原始发酵路径 */
export interface RawEvoPath {
  steps: RawEvoStep[];
  links: Array<{ source: string; target: string; value: number; label?: string }>;
}

/** 桑基图链接 */
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

/** API 完整响应 */
export interface RawThemeEvolutionResponse {
  startDate: string;
  days: string;
  dates: string[];
  summary: {
    totalFlow: number;
    activeNodes: number;
    majorFlows: number;
    themeCount: number;
  };
  sankeyData: {
    nodes: RawThemeEvoNode[];
    links: SankeyLink[];
  };
}

/** 题材演化域模型 */
export interface ThemeEvolutionData {
  nodes: ThemeEvoNode[];
  paths: EvoPath[];
  sankeyNodes: RawThemeEvoNode[];
  sankeyLinks: SankeyLink[];
  summary: RawThemeEvolutionResponse["summary"] | null;
  updatedAt: number;
}

/** 后端题材演化响应 */
export type ThemeEvolutionResponse = ApiResponse<RawThemeEvolutionResponse>;

/** 当前选中的节点信息 */
export interface SelectedThemeNode {
  themeId: string;
  themeName: string;
  childType: EvoChildType;
}

/** Raw → Domain 个股转换 */
export function mapRawEvoStock(raw: RawEvoStock): EvoStock {
  return {
    code: raw.code,
    name: raw.name,
    latest: raw.latest,
    changeRate: raw.change_rate,
    tradingAmount: raw.trading_amount,
    continueNum: raw.continue_num,
    highDays: raw.high_days,
    firstLimitUpTime: raw.first_limit_up_time,
    limitUpType: raw.limit_up_type,
    orderAmount: raw.order_amount,
    currencyValue: raw.currency_value,
    turnoverRate: raw.turnover_rate,
    industry: raw.industry,
    reasonType: raw.reason_type,
    reasonInfo: raw.reason_info,
    categoryName: raw.jiuyangongshe_category_name,
    categoryAnalysis: raw.jiuyangongshe_analysis,
    limitUpSucRate: raw.limit_up_suc_rate,
    isAgainLimit: raw.is_again_limit,
    changeTag: raw.change_tag,
  };
}
