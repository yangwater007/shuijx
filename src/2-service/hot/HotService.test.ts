/** 服务层测试 — HotService */

import { describe, it, expect } from "vitest";
import HotService from "./HotService";
import type { HotStockItem, HotNewsItem } from "@infra/types/stock";

describe("HotService", () => {
  describe("sortStocksByHeat", () => {
    it("按热度降序排列", () => {
      const stocks: HotStockItem[] = [
        { rank: 1, code: "a", name: "A", heat: 100, changePct: 1, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
        { rank: 2, code: "b", name: "B", heat: 300, changePct: 2, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
        { rank: 3, code: "c", name: "C", heat: 200, changePct: 0, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
      ];
      const sorted = HotService.sortStocksByHeat(stocks);
      expect(sorted[0]!.heat).toBe(300);
      expect(sorted[2]!.heat).toBe(100);
    });
  });

  describe("deduplicateStocks", () => {
    it("按代码去重保留热度最高的", () => {
      const stocks: HotStockItem[] = [
        { rank: 1, code: "000001", name: "A", heat: 200, changePct: 0, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
        { rank: 2, code: "000001", name: "A", heat: 300, changePct: 0, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
        { rank: 3, code: "000002", name: "B", heat: 100, changePct: 0, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
      ];
      const deduped = HotService.deduplicateStocks(stocks);
      expect(deduped).toHaveLength(2);
      expect(deduped.find((s) => s.code === "000001")!.heat).toBe(300);
    });
  });

  describe("processHotList", () => {
    it("组合排序去重", () => {
      const stocks: HotStockItem[] = [
        { rank: 1, code: "a", name: "A", heat: 100, changePct: 1, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
        { rank: 2, code: "b", name: "B", heat: 300, changePct: 2, rankChange: 0, conceptTags: [], popularityTag: "", analyseTitle: "", analyse: "" },
      ];
      const news: HotNewsItem[] = [
        { rank: 1, title: "N1", url: "", source: "S1", summary: "", hotValue: "10", heat: 10, publishTimeFormatted: "", category: "", relatedStocks: [] },
        { rank: 2, title: "N2", url: "", source: "S2", summary: "", hotValue: "20", heat: 20, publishTimeFormatted: "", category: "", relatedStocks: [] },
      ];
      const result = HotService.processHotList(stocks, news);
      expect(result.stocks[0]!.heat).toBe(300);
      expect(result.news[0]!.heat).toBe(20);
      expect(result.updatedAt).toBeGreaterThan(0);
    });
  });
});
