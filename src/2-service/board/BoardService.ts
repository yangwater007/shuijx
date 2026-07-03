/**
 * 服务层 — 连板天梯业务逻辑（纯函数）
 * 处理 BoardLadder 领域模型数据的统计和筛选
 */

import type { BoardLadder, BoardStock, BoardDate } from "@data/models/board.model";

/**
 * 从天梯数据提取统计摘要
 */
export interface LadderSummary {
  maxLevel: number;
  totalStocks: number;
  levelCount: number;
  pauseRatio: number;
}

function getLatestDate(ladder: BoardLadder): BoardDate | null {
  return ladder.dates[ladder.dates.length - 1] ?? null;
}

function getRecentDates(ladder: BoardLadder, days: number): BoardDate[] {
  return ladder.dates.slice(-days);
}

function getSummary(ladder: BoardLadder): LadderSummary {
  const latest = getLatestDate(ladder);
  if (!latest) {
    return { maxLevel: 0, totalStocks: 0, levelCount: 0, pauseRatio: 0 };
  }
  return {
    maxLevel: latest.levels[0]?.level ?? 0,
    totalStocks: latest.totalStocks,
    levelCount: latest.levels.length,
    pauseRatio: latest.pauseRatio,
  };
}

function getStocksByLevel(ladder: BoardLadder, level: number): BoardStock[] {
  const latest = getLatestDate(ladder);
  if (!latest) return [];
  return latest.levels.find((lv) => lv.level === level)?.stocks ?? [];
}

function searchStocks(ladder: BoardLadder, keyword: string): BoardStock[] {
  const latest = getLatestDate(ladder);
  if (!latest || !keyword.trim()) return [];
  const kw = keyword.toLowerCase();
  return latest.levels
    .flatMap((lv) => lv.stocks)
    .filter(
      (s) =>
        s.name.toLowerCase().includes(kw) || s.code.includes(kw)
    );
}

const BoardService = {
  getLatestDate,
  getRecentDates,
  getSummary,
  getStocksByLevel,
  searchStocks,
};

export default BoardService;
