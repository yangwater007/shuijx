/** 业务层 — 热榜 Hook */

import { useState, useCallback, useEffect } from "react";
import hotRepository from "@data/repository/hot";
import HotService from "@service/hot/HotService";
import type { HotStockItem, HotNewsItem } from "@infra/types/stock";
import type { HotData } from "@data/dto/hot";

const EMPTY: HotData = { stocks: [], news: [], updatedAt: 0 };
export type HotTab = "stocks" | "news";

export default function useHotList() {
  const [data, setData] = useState<HotData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HotTab>("stocks");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stocks, news] = await Promise.all([
        hotRepository.fetchStockHotList(),
        hotRepository.fetchNewsHotList(),
      ]);
      setData(HotService.processHotList(stocks, news));
    } catch (err) {
      setError(err instanceof Error ? err.message : "数据加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeList: HotStockItem[] | HotNewsItem[] =
    activeTab === "stocks" ? data.stocks : data.news;

  return {
    stocks: data.stocks, news: data.news, activeList,
    activeTab, setActiveTab, loading, error, refresh,
  };
}
