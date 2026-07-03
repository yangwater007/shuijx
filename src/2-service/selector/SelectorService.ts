/** 服务层 — 条件选股业务逻辑（纯函数） */

import type { Stock } from "@infra/types/stock";
import type { SelectorCriteria, SelectorResult } from "@data/dto/selector";

/**
 * 按涨跌幅范围过滤
 */
function filterByChangePct(
  stocks: readonly Stock[],
  min?: number,
  max?: number
): Stock[] {
  return stocks.filter((s) => {
    if (min !== undefined && s.changePct < min) return false;
    if (max !== undefined && s.changePct > max) return false;
    return true;
  });
}

/**
 * 按股价范围过滤
 */
function filterByPrice(
  stocks: readonly Stock[],
  min?: number,
  max?: number
): Stock[] {
  return stocks.filter((s) => {
    if (min !== undefined && s.price < min) return false;
    if (max !== undefined && s.price > max) return false;
    return true;
  });
}

/**
 * 按量比过滤（volumeRatio = currentVolume / avgVolume）
 * avgVolume 由外部通过 volumeMap 提供
 */
function filterByVolumeRatio(
  stocks: readonly Stock[],
  minRatio: number,
  avgVolumeMap: ReadonlyMap<string, number>
): Stock[] {
  return stocks.filter((s) => {
    const avgVol = avgVolumeMap.get(s.code);
    if (avgVol === undefined || avgVol <= 0) return true;
    const ratio = s.volume / avgVol;
    return ratio >= minRatio;
  });
}

/**
 * 按概念/题材过滤
 * conceptMap: 股票代码 → 所属概念列表
 */
function filterByConcept(
  stocks: readonly Stock[],
  concept: string,
  conceptMap: ReadonlyMap<string, readonly string[]>
): Stock[] {
  const keyword = concept.toLowerCase();
  return stocks.filter((s) => {
    const concepts = conceptMap.get(s.code);
    if (!concepts) return false;
    return concepts.some((c) => c.toLowerCase().includes(keyword));
  });
}

/**
 * 排序
 */
function sortStocks(
  stocks: readonly Stock[],
  sortBy: SelectorCriteria["sortBy"],
  sortOrder: SelectorCriteria["sortOrder"]
): Stock[] {
  const order = sortOrder === "desc" ? -1 : 1;
  const sorted = [...stocks];

  sorted.sort((a, b) => {
    let valA: number;
    let valB: number;
    switch (sortBy) {
      case "volume":
        valA = a.volume;
        valB = b.volume;
        break;
      case "price":
        valA = a.price;
        valB = b.price;
        break;
      case "changePct":
      default:
        valA = a.changePct;
        valB = b.changePct;
        break;
    }
    return (valA - valB) * order;
  });

  return sorted;
}

/**
 * 核心：执行多条件筛选
 */
function filter(
  stocks: readonly Stock[],
  criteria: SelectorCriteria,
  conceptMap?: ReadonlyMap<string, readonly string[]>,
  avgVolumeMap?: ReadonlyMap<string, number>
): SelectorResult {
  let result: Stock[] = [...stocks];

  if (criteria.concept && conceptMap) {
    result = filterByConcept(result, criteria.concept, conceptMap);
  }

  result = filterByChangePct(result, criteria.minChangePct, criteria.maxChangePct);
  result = filterByPrice(result, criteria.minPrice, criteria.maxPrice);

  if (criteria.minVolumeRatio !== undefined && avgVolumeMap) {
    result = filterByVolumeRatio(result, criteria.minVolumeRatio, avgVolumeMap);
  }

  result = sortStocks(result, criteria.sortBy ?? "changePct", criteria.sortOrder ?? "desc");

  return {
    stocks: result,
    total: result.length,
    criteria,
    updatedAt: Date.now(),
  };
}

const SelectorService = {
  filterByChangePct,
  filterByPrice,
  filterByVolumeRatio,
  filterByConcept,
  sortStocks,
  filter,
};

export default SelectorService;
