/**
 * 映射器测试 — board.mapper
 */

import { describe, it, expect } from "vitest";
import { mapRawStock, mapRawLevel, mapRawResponse } from "./board.mapper";
import type { RawBoardStock, RawBoardLevel, RawBoardLadderResponse } from "./board.model";

const rawStock: RawBoardStock = {
  name: "测试股",
  code: "000001",
  price: "25.50元",
  change: "+10.00%",
  changeColor: "red",
  amount: 1000000000,
  tradeAmount: "10.00亿",
  limitAmount: "2.00亿",
  first_limit_up_time: "1690000000",
  industry: "金融",
  primary_theme: "银行",
  open: 23.0,
  high: 25.5,
  low: 22.8,
  yclose: 23.18,
  main_business: "银行业务",
  business_scope: "金融",
  last_limit_up_time: "1690001000",
  limit_up_type: "一字板",
  open_num: 0,
  continue_num: 3,
  high_days: "3天3板",
  latest: 25.5,
  change_rate: 10.0,
  currency_value: 50000000000,
  actual_currency_value: 30000000000,
  turnover_rate: 3.5,
  actual_turnover_rate: 4.2,
  order_volume: 5000000,
  order_amount: 125000000,
  trading_amount: 1000000000,
  kpl_trading_amount: 800000000,
  kpl_limit_order: 200000000,
  kpl_lu_limit_order: 250000000,
  kpl_net_change: 50000000,
  kpl_free_float: 30000000000,
  kpl_turnover_rate: 3.5,
  reason_type: "政策利好",
  reason_info: "测试涨停原因详情",
  jiuyangongshe_category_name: "金融",
  jiuyangongshe_analysis: "测试分析",
};

describe("board.mapper", () => {
  describe("mapRawStock", () => {
    it("红色映射为 up", () => {
      const s = mapRawStock(rawStock);
      expect(s.changeDirection).toBe("up");
      expect(s.code).toBe("000001");
      expect(s.changeRate).toBe(10.0);
    });

    it("价格解析正确", () => {
      const s = mapRawStock(rawStock);
      expect(s.price).toBe(25.5);
    });
  });

  describe("mapRawLevel", () => {
    it("计算正确的 count", () => {
      const raw: RawBoardLevel = { level: 3, stocks: [rawStock, { ...rawStock, code: "000002" }] };
      const lv = mapRawLevel(raw);
      expect(lv.count).toBe(2);
    });
  });

  describe("mapRawResponse", () => {
    it("完整映射所有日期", () => {
      const raw: RawBoardLadderResponse = {
        dateRange: "2026-06-20 至 2026-06-27",
        dates: [
          {
            date: "20260622",
            dayOfWeek: "周一",
            totalStocks: 1,
            pauseRatio: 3.0,
            boards: [{ level: 3, stocks: [rawStock] }],
          },
        ],
      };
      const ladder = mapRawResponse(raw);
      expect(ladder.dates).toHaveLength(1);
      expect(ladder.dates[0]!.levels).toHaveLength(1);
      expect(ladder.updatedAt).toBeGreaterThan(0);
    });
  });
});
