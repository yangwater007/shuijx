/** 数据层 — 热榜 Repository，对接 quicktiny 真实 API */

import http from "@infra/http";
import type { HotStockItem, HotNewsItem } from "@infra/types/stock";

/** 开盘啦 API 原始返回 */
interface KaipanlaRaw {
  code: string;
  name: string;
  hotRank: number;
  rank: number;
  rankChange: number;
  value: number;
  changePercent: number;
  conceptTags: string[];
  popularityTag: string;
  tags: string[];
  analyse: string;
  analyseTitle: string;
}

/** 第一财经新闻原始返回 */
interface YicaiRaw {
  id: string;
  title: string;
  url: string;
  summary: string;
  hotValue: string;
  source: string;
  publishTimeFormatted: string;
  category: string;
}

/** 财联社电报原始返回 */
interface CailianRaw {
  id: number;
  content: string;
  brief: string;
  ctime: number;
  readingNum: number;
}

class HotRepository {
  /** 获取股票热榜（开盘啦） */
  async fetchStockHotList(): Promise<HotStockItem[]> {
    try {
      const resp = await http.get<{ success: boolean; data: KaipanlaRaw[] }>("/hotlist/kaipanla");
      const raw = resp.data?.data ?? [];

      return raw.map((item) => ({
        rank: item.hotRank ?? item.rank,
        code: item.code,
        name: item.name,
        changePct: item.changePercent ?? 0,
        rankChange: item.rankChange ?? 0,
        heat: item.value ?? 0,
        conceptTags: item.conceptTags ?? [],
        popularityTag: item.popularityTag ?? "",
        analyseTitle: item.analyseTitle ?? "",
        analyse: item.analyse ?? "",
      }));
    } catch {
      return [];
    }
  }

  /** 获取新闻热榜（第一财经 + 财联社合并） */
  async fetchNewsHotList(): Promise<HotNewsItem[]> {
    try {
      const [yicaiResp, cailianResp] = await Promise.allSettled([
        http.get<{ success: boolean; data: YicaiRaw[] }>("/news/yicai"),
        http.get<{ error: number; data: CailianRaw[] }>("/cailian-telegraph"),
      ]);

      const news: HotNewsItem[] = [];

      // 第一财经
      if (yicaiResp.status === "fulfilled") {
        const yicaiData = yicaiResp.value.data?.data ?? [];
        for (let i = 0; i < yicaiData.length; i++) {
          const item = yicaiData[i]!;
          const hotNum = parseInt(item.hotValue ?? "0", 10) || 10 - i;
          news.push({
            rank: i + 1,
            title: item.title,
            url: item.url,
            source: item.source,
            summary: item.summary,
            hotValue: item.hotValue,
            heat: hotNum,
            publishTimeFormatted: item.publishTimeFormatted ?? "",
            category: item.category ?? "",
            relatedStocks: [],
          });
        }
      }

      // 财联社电报（追加）
      if (cailianResp.status === "fulfilled") {
        const cailianData = cailianResp.value.data?.data ?? [];
        const baseRank = news.length;
        for (let i = 0; i < Math.min(cailianData.length, 20); i++) {
          const item = cailianData[i]!;
          news.push({
            rank: baseRank + i + 1,
            title: item.content.slice(0, 50),
            url: "",
            source: "财联社",
            summary: item.content,
            hotValue: `${item.readingNum}阅读`,
            heat: item.readingNum ?? 0,
            publishTimeFormatted: new Date(item.ctime * 1000).toLocaleString("zh-CN"),
            category: "电报",
            relatedStocks: [],
          });
        }
      }

      // 按热度降序
      news.sort((a, b) => b.heat - a.heat);
      // 重新排名
      news.forEach((n, i) => { n.rank = i + 1; });

      return news;
    } catch {
      return [];
    }
  }
}

const hotRepository = new HotRepository();
export default hotRepository;
export { HotRepository };
