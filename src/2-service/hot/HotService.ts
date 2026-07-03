/** 服务层 — 热榜业务逻辑（纯函数） */

import type { HotStockItem, HotNewsItem } from "@infra/types/stock";
import type { HotData } from "@data/dto/hot";

function sortStocksByHeat(stocks: HotStockItem[]): HotStockItem[] {
  return [...stocks].sort((a, b) => b.heat - a.heat);
}

function sortNewsByHeat(news: HotNewsItem[]): HotNewsItem[] {
  return [...news].sort((a, b) => b.heat - a.heat);
}

function deduplicateStocks(stocks: HotStockItem[]): HotStockItem[] {
  const seen = new Map<string, HotStockItem>();
  for (const item of stocks) {
    const existing = seen.get(item.code);
    if (!existing || item.heat > existing.heat) seen.set(item.code, item);
  }
  return Array.from(seen.values());
}

function processHotList(stocks: HotStockItem[], news: HotNewsItem[]): HotData {
  return {
    stocks: deduplicateStocks(sortStocksByHeat(stocks)),
    news: sortNewsByHeat(news),
    updatedAt: Date.now(),
  };
}

const HotService = {
  sortStocksByHeat, sortNewsByHeat, deduplicateStocks, processHotList,
};
export default HotService;
