/**
 * 连板天梯数据映射器 — Raw 类型 → Domain 类型转换
 */

import type {
  RawBoardStock,
  RawBoardLevel,
  RawBoardDate,
  RawBoardLadderResponse,
  BoardStock,
  BoardLevel,
  BoardDate,
  BoardLadder,
} from "@data/models/board.model";

/**
 * 原始股票 → 领域模型股票
 * 提取前端需要的关键字段，类型转换
 */
export function mapRawStock(raw: RawBoardStock): BoardStock {
  return {
    name: raw.name,
    code: raw.code,
    price: parseFloat(raw.price) || raw.latest || 0,
    changeRate: raw.change_rate,
    changeDirection: raw.changeColor === "red" ? "up" : "down",
    preClose: raw.yclose,
    open: raw.open,
    high: raw.high,
    low: raw.low,
    amount: raw.amount,
    turnoverRate: raw.turnover_rate,
    actualTurnoverRate: raw.actual_turnover_rate,
    freeFloat: raw.kpl_free_float,
    industry: raw.industry,
    primaryTheme: raw.primary_theme,
    continueNum: raw.continue_num,
    highDays: raw.high_days,
    limitUpType: raw.limit_up_type,
    openNum: raw.open_num,
    reasonInfo: raw.reason_info,
    firstLimitUpTime: raw.first_limit_up_time,
    limitAmount: raw.limitAmount,
  };
}

/**
 * 原始层级 → 领域模型层级
 */
export function mapRawLevel(raw: RawBoardLevel): BoardLevel {
  const stocks = raw.stocks.map(mapRawStock);
  return {
    level: raw.level,
    stocks,
    count: stocks.length,
  };
}

/**
 * 原始单日数据 → 领域模型单日数据
 */
export function mapRawDate(raw: RawBoardDate): BoardDate {
  return {
    date: raw.date,
    dayOfWeek: raw.dayOfWeek,
    totalStocks: raw.totalStocks,
    pauseRatio: raw.pauseRatio,
    levels: raw.boards.map(mapRawLevel),
  };
}

/**
 * 原始 API 响应 → 领域模型完整天梯
 */
export function mapRawResponse(raw: RawBoardLadderResponse): BoardLadder {
  return {
    dateRange: raw.dateRange,
    dates: raw.dates.map(mapRawDate),
    updatedAt: Date.now(),
  };
}
