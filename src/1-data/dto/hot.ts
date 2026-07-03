/** 数据层 — 热榜 DTO */

import type { HotStockItem, HotNewsItem } from "@infra/types/stock";

export interface HotData {
  stocks: HotStockItem[];
  news: HotNewsItem[];
  updatedAt: number;
}
