/**
 * 服务层测试 — BoardService（适配新领域模型）
 */

import { describe, it, expect } from "vitest";
import BoardService from "./BoardService";
import type { BoardLadder, BoardLevel, BoardStock } from "@data/models/board.model";

function makeStock(
  code: string,
  name: string,
  changeRate: number,
  industry = "科技"
): BoardStock {
  return {
    name,
    code,
    price: 25,
    changeRate,
    changeDirection: changeRate > 0 ? "up" : "down",
    preClose: 23,
    open: 24,
    high: 26,
    low: 23,
    amount: 500000000,
    turnoverRate: 5.2,
    actualTurnoverRate: 6.1,
    freeFloat: 5000000000,
    industry,
    primaryTheme: "人工智能",
    continueNum: 3,
    highDays: "3天3板",
    limitUpType: "换手板",
    openNum: 0,
    reasonInfo: "测试涨停原因",
    firstLimitUpTime: "1690000000",
    limitAmount: "2.50亿",
  };
}

function makeLevel(level: number, stocks: BoardStock[]): BoardLevel {
  return { level, stocks, count: stocks.length };
}

function makeLadder(
  levels: BoardLevel[],
  totalStocks: number,
  pauseRatio = 3.5
): BoardLadder {
  return {
    dateRange: "2026-06-20 至 2026-06-27",
    dates: [
      {
        date: "20260620",
        dayOfWeek: "周五",
        totalStocks: totalStocks - 10,
        pauseRatio: 4.0,
        levels: [],
      },
      {
        date: "20260622",
        dayOfWeek: "周一",
        totalStocks,
        pauseRatio,
        levels,
      },
    ],
    updatedAt: Date.now(),
  };
}

describe("BoardService", () => {
  const stocks = [
    makeStock("001", "三连板A", 10),
    makeStock("002", "三连板B", 9.5),
    makeStock("003", "首板", 10),
  ];

  const ladder = makeLadder(
    [
      makeLevel(3, [stocks[0]!, stocks[1]!]),
      makeLevel(1, [stocks[2]!]),
    ],
    3
  );

  describe("getLatestDate", () => {
    it("返回最后一天的数据", () => {
      const d = BoardService.getLatestDate(ladder);
      expect(d?.date).toBe("20260622");
    });
  });

  describe("getSummary", () => {
    it("计算正确的统计摘要", () => {
      const s = BoardService.getSummary(ladder);
      expect(s.maxLevel).toBe(3);
      expect(s.totalStocks).toBe(3);
      expect(s.levelCount).toBe(2);
      expect(s.pauseRatio).toBe(3.5);
    });

    it("空数据返回零值摘要", () => {
      const empty = makeLadder([], 0);
      const s = BoardService.getSummary(empty);
      expect(s.maxLevel).toBe(0);
      expect(s.totalStocks).toBe(0);
    });
  });

  describe("getStocksByLevel", () => {
    it("按层级筛选", () => {
      const r = BoardService.getStocksByLevel(ladder, 3);
      expect(r).toHaveLength(2);
    });

    it("不存在的层级返回空", () => {
      const r = BoardService.getStocksByLevel(ladder, 5);
      expect(r).toHaveLength(0);
    });
  });

  describe("searchStocks", () => {
    it("按名称搜索", () => {
      const r = BoardService.searchStocks(ladder, "三连板A");
      expect(r).toHaveLength(1);
    });

    it("按代码搜索", () => {
      const r = BoardService.searchStocks(ladder, "003");
      expect(r).toHaveLength(1);
    });

    it("无匹配返回空", () => {
      const r = BoardService.searchStocks(ladder, "不存在");
      expect(r).toHaveLength(0);
    });
  });

  describe("getRecentDates", () => {
    it("返回最近 N 天", () => {
      const r = BoardService.getRecentDates(ladder, 1);
      expect(r).toHaveLength(1);
      expect(r[0]!.date).toBe("20260622");
    });
  });
});
