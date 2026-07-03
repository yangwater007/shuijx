/**
 * 连板天梯数据模型 — Raw 类型（100% 对齐 API 响应） 与 Domain 类型
 *
 * API 端点: GET https://stock.quicktiny.cn/api/ladder
 * 查询参数: date (可选, YYYY-MM-DD)
 */

// ──────────────────────────────────────────────
// Raw 类型 — 与 API snake_case 字段名严格一致
// ──────────────────────────────────────────────

/**
 * API 返回的单只股票原始数据
 * 所有字段名对齐 API 的 snake_case 格式
 */
export interface RawBoardStock {
  /** 股票名称 */
  name: string;
  /** 股票代码（6位数字） */
  code: string;
  /** 当前价格（含"元"后缀，如 "47.98元"） */
  price: string;
  /** 涨跌幅（含"%"后缀，如 "-1.58%"） */
  change: string;
  /** 涨跌颜色标识: "red"=上涨, "green"=下跌 */
  changeColor: "red" | "green";
  /** 成交额（数值，单位：元？） */
  amount: number;
  /** 成交额（格式化字符串，如 "27.47亿"） */
  tradeAmount: string;
  /** 封单额（格式化字符串，如 "3.51亿"） */
  limitAmount: string;
  /** 首次涨停时间戳（Unix 秒级） */
  first_limit_up_time: string;
  /** 所属行业 */
  industry: string;
  /** 主要题材/概念 */
  primary_theme: string;
  /** 开盘价 */
  open: number;
  /** 最高价 */
  high: number;
  /** 最低价 */
  low: number;
  /** 昨日收盘价 */
  yclose: number;
  /** 主营业务描述 */
  main_business: string;
  /** 经营范围 */
  business_scope: string;
  /** 最后封板时间戳 */
  last_limit_up_time: string;
  /** 涨停类型（如 "一字板"、"换手板"） */
  limit_up_type: string;
  /** 开板次数（null 表示未开板） */
  open_num: number | null;
  /** 连板天数 */
  continue_num: number;
  /** 高位天数描述（如 "7天6板"） */
  high_days: string;
  /** 最新价格（数值） */
  latest: number;
  /** 涨跌幅（数值，如 9.9976 表示 +9.9976%） */
  change_rate: number;
  /** 总市值（数值） */
  currency_value: number;
  /** 实际流通市值 */
  actual_currency_value: number;
  /** 换手率（百分比数值） */
  turnover_rate: number;
  /** 实际换手率 */
  actual_turnover_rate: number;
  /** 委托量 */
  order_volume: number;
  /** 委托金额 */
  order_amount: number;
  /** 成交金额 */
  trading_amount: number;
  /** KPL 成交金额 */
  kpl_trading_amount: number;
  /** KPL 涨停封单 */
  kpl_limit_order: number;
  /** KPL 涨停板封单 */
  kpl_lu_limit_order: number;
  /** KPL 资金净变动 */
  kpl_net_change: number;
  /** KPL 自由流通市值 */
  kpl_free_float: number;
  /** KPL 换手率 */
  kpl_turnover_rate: number;
  /** 涨停原因类型 */
  reason_type: string;
  /** 涨停原因详情（AI 生成的摘要） */
  reason_info: string;
  /** 韭研公社分类名称 */
  jiuyangongshe_category_name: string;
  /** 韭研公社分析摘要 */
  jiuyangongshe_analysis: string;
}

/**
 * API 返回的单层连板数据
 */
export interface RawBoardLevel {
  /** 连板层级（如 5 表示 5连板） */
  level: number;
  /** 该层级所有股票 */
  stocks: RawBoardStock[];
}

/**
 * API 返回的单日连板数据
 */
export interface RawBoardDate {
  /** 日期（YYYYMMDD 格式，如 "20260622"） */
  date: string;
  /** 星期几（如 "周一"） */
  dayOfWeek: string;
  /** 当日涨停股票总数 */
  totalStocks: number;
  /** 炸板率（百分比数值） */
  pauseRatio: number;
  /** 各连板层级数据（按层级降序排列） */
  boards: RawBoardLevel[];
}

/**
 * API 完整响应类型
 */
export interface RawBoardLadderResponse {
  /** 数据覆盖的日期范围（如 "2026-06-20 至 2026-06-27"） */
  dateRange: string;
  /** 每日连板数据 */
  dates: RawBoardDate[];
}

// ──────────────────────────────────────────────
// Domain 类型 — 内部领域模型（camelCase）
// ──────────────────────────────────────────────

/**
 * 内部使用的股票核心信息模型
 * 提取自 RawBoardStock，仅保留前端展示所需字段
 */
export interface BoardStock {
  /** 股票名称 */
  name: string;
  /** 股票代码 */
  code: string;
  /** 当前价格 */
  price: number;
  /** 涨跌幅百分比（数值） */
  changeRate: number;
  /** 上涨/下跌: "up" | "down" */
  changeDirection: "up" | "down";
  /** 昨日收盘价 */
  preClose: number;
  /** 开盘价 */
  open: number;
  /** 最高价 */
  high: number;
  /** 最低价 */
  low: number;
  /** 成交额（数值） */
  amount: number;
  /** 换手率 */
  turnoverRate: number;
  /** 实际换手率 */
  actualTurnoverRate: number;
  /** 流通市值 */
  freeFloat: number;
  /** 所属行业 */
  industry: string;
  /** 主要题材 */
  primaryTheme: string;
  /** 连板天数 */
  continueNum: number;
  /** 高位天数描述 */
  highDays: string;
  /** 涨停类型 */
  limitUpType: string;
  /** 开板次数（null 表示未开） */
  openNum: number | null;
  /** 涨停原因摘要 */
  reasonInfo: string;
  /** 首次涨停时间戳 */
  firstLimitUpTime: string;
  /** 封单额（格式化） */
  limitAmount: string;
}

/**
 * 内部使用的层级模型
 */
export interface BoardLevel {
  /** 连板层级 */
  level: number;
  /** 该层级股票列表 */
  stocks: BoardStock[];
  /** 股票数量 */
  count: number;
}

/**
 * 内部使用的单日天梯数据
 */
export interface BoardDate {
  /** 日期（YYYYMMDD） */
  date: string;
  /** 星期几 */
  dayOfWeek: string;
  /** 涨停总数 */
  totalStocks: number;
  /** 炸板率 */
  pauseRatio: number;
  /** 各层级 */
  levels: BoardLevel[];
}

/**
 * 内部使用的完整天梯模型
 */
export interface BoardLadder {
  /** 日期范围 */
  dateRange: string;
  /** 每日数据 */
  dates: BoardDate[];
  /** 数据更新时间戳 */
  updatedAt: number;
}

// ──────────────────────────────────────────────
// 类型守卫
// ──────────────────────────────────────────────

/**
 * 判断是否为有效的 RawBoardLadderResponse
 */
export function isRawBoardLadderResponse(value: unknown): value is RawBoardLadderResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.dateRange === "string" && Array.isArray(obj.dates);
}
