/** 数据层 — 题材库 DTO 类型 */

import type { Stock, ApiResponse } from "@infra/types/stock";

/** 题材概念 */
export interface Theme {
  /** 题材唯一标识 */
  id: string;
  /** 题材名称 */
  name: string;
  /** 题材描述 */
  description: string;
  /** 关联股票数量 */
  stockCount: number;
  /** 题材分类标签 */
  category: string;
  /** 题材热度（0-100） */
  heat: number;
}

/** 题材详情（含股票列表） */
export interface ThemeDetail extends Theme {
  stocks: Stock[];
  /** 龙头股代码 */
  leaderCode?: string;
}

/** 题材分类 */
export interface ThemeCategory {
  name: string;
  themes: Theme[];
}

/** 后端题材列表响应 */
export interface ThemeListResponse extends ApiResponse<Theme[]> {}

/** 后端题材详情响应 */
export interface ThemeDetailResponse extends ApiResponse<ThemeDetail> {}

/** 重组后的题材库数据 */
export interface ThemeData {
  /** 按分类组织的题材列表 */
  categories: ThemeCategory[];
  /** 所有题材（扁平列表） */
  allThemes: Theme[];
  /** 总题材数 */
  total: number;
  updatedAt: number;
}
