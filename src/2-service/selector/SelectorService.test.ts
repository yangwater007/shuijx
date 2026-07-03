/** 服务层测试 — SelectorService */

import { describe, it, expect } from "vitest";
import SelectorService from "./SelectorService";
import type { Stock } from "@infra/types/stock";

function makeStock(
  code: string,
  name: string,
  price: number,
  changePct: number,
  volume = 50000
): Stock {
  return {
    code, name, price, changePct,
    change: 0.1, volume,
    amount: volume * price, turnover: volume * price,
    amplitude: 3, turnoverRate: 5, volumeRatio: 1.2,
    high: price + 1, low: price - 1,
    open: price, preClose: price,
    marketCap: 1e10, circulatingCap: 5e9,
    pe: 20, pb: 2.5,
  };
}

const stocks: Stock[] = [
  makeStock("001", "高价高涨幅", 80, 8.5, 120000),
  makeStock("002", "中价中涨幅", 30, 3.2, 60000),
  makeStock("003", "低价低涨幅", 5, 1.5, 30000),
  makeStock("004", "中价负涨幅", 25, -2.1, 45000),
];

describe("SelectorService", () => {
  describe("filterByChangePct", () => {
    it("过滤涨跌幅范围", () => {
      const r = SelectorService.filterByChangePct(stocks, 3, 10);
      expect(r).toHaveLength(2);
      expect(r.map((s) => s.code)).toEqual(["001", "002"]);
    });

    it("仅最小值过滤", () => {
      const r = SelectorService.filterByChangePct(stocks, 3);
      expect(r).toHaveLength(2);
    });

    it("无过滤条件返回全部", () => {
      const r = SelectorService.filterByChangePct(stocks);
      expect(r).toHaveLength(4);
    });
  });

  describe("filterByPrice", () => {
    it("过滤股价范围", () => {
      const r = SelectorService.filterByPrice(stocks, 20, 50);
      expect(r.map((s) => s.code)).toEqual(["002", "004"]);
    });
  });

  describe("filterByVolumeRatio", () => {
    it("按量比过滤", () => {
      const avgMap = new Map([
        ["001", 60000], // ratio = 2
        ["002", 30000], // ratio = 2
        ["003", 30000], // ratio = 1
        ["004", 45000], // ratio = 1
      ]);
      const r = SelectorService.filterByVolumeRatio(stocks, 1.5, avgMap);
      expect(r.map((s) => s.code)).toEqual(["001", "002"]);
    });
  });

  describe("filterByConcept", () => {
    it("按概念关键词过滤", () => {
      const conceptMap = new Map([
        ["001", ["人工智能", "芯片"]],
        ["002", ["新能源"]],
        ["003", []],
      ]);
      const stocks3 = [stocks[0]!, stocks[1]!, stocks[2]!];
      const r = SelectorService.filterByConcept(stocks3, "人工", conceptMap);
      expect(r).toHaveLength(1);
      expect(r[0]!.code).toBe("001");
    });
  });

  describe("sortStocks", () => {
    it("按涨跌幅降序", () => {
      const r = SelectorService.sortStocks(stocks, "changePct", "desc");
      expect(r[0]!.code).toBe("001");
      expect(r[3]!.code).toBe("004");
    });

    it("按股价升序", () => {
      const r = SelectorService.sortStocks(stocks, "price", "asc");
      expect(r[0]!.code).toBe("003");
    });
  });

  describe("filter", () => {
    it("组合筛选：涨幅+股价", () => {
      const r = SelectorService.filter(stocks, {
        minChangePct: 3,
        maxPrice: 50,
      });
      expect(r.stocks.map((s) => s.code)).toEqual(["002"]);
    });

    it("默认按涨跌幅降序", () => {
      const r = SelectorService.filter(stocks, {});
      expect(r.stocks[0]!.code).toBe("001");
    });
  });
});
