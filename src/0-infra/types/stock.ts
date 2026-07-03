/** 基础设施层 — 核心业务类型定义 */

/** ─── 股票基本信息 ─── */
export interface Stock {
  code: string;
  name: string;
  price: number;
  changePct: number;
  change: number;
  volume: number;
  amount: number;
  turnover: number;
  amplitude: number;
  turnoverRate: number;
  volumeRatio: number;
  high: number;
  low: number;
  open: number;
  preClose: number;
  marketCap: number;
  circulatingCap: number;
  pe: number;
  pb: number;
}

/** ─── 连板天梯层级 ─── */
export interface BoardLevel {
  level: number;
  stocks: Stock[];
  count: number;
}

/** ─── 热榜条目 — 股票（对齐 /api/hotlist/kaipanla） ─── */
export interface HotStockItem {
  /** 排名 */
  rank: number;
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 涨跌幅（百分比数值） */
  changePct: number;
  /** 排名变化（正=上升） */
  rankChange: number;
  /** 热度值 */
  heat: number;
  /** 概念标签 */
  conceptTags: string[];
  /** 人气标签（如"4天3板"） */
  popularityTag: string;
  /** 分析标题 */
  analyseTitle: string;
  /** 分析内容 */
  analyse: string;
}

/** ─── 热榜条目 — 新闻 ─── */
export interface HotNewsItem {
  /** 排名 */
  rank: number;
  /** 新闻标题 */
  title: string;
  /** 原文链接 */
  url: string;
  /** 来源 */
  source: string;
  /** 摘要 */
  summary: string;
  /** 热度文字 */
  hotValue: string;
  /** 热度数值 */
  heat: number;
  /** 发布时间 */
  publishTimeFormatted: string;
  /** 分类 */
  category: string;
  /** 相关股票 */
  relatedStocks: string[];
}

/** ─── API 返回结构 ─── */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}
