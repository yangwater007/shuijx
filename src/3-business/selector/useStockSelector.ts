/** 业务层 — 条件选股 Hook */

import { useState, useCallback } from "react";
import selectorRepository from "@data/repository/selector";
import SelectorService from "@service/selector/SelectorService";
import type { SelectorCriteria, SelectorResult } from "@data/dto/selector";

/** 初始空结果 */
const EMPTY_RESULT: SelectorResult = {
  stocks: [],
  total: 0,
  criteria: {},
  updatedAt: 0,
};

/** 默认筛选条件 */
const DEFAULT_CRITERIA: SelectorCriteria = {
  sortBy: "changePct",
  sortOrder: "desc",
};

export default function useStockSelector() {
  const [criteria, setCriteria] = useState<SelectorCriteria>(DEFAULT_CRITERIA);
  const [result, setResult] = useState<SelectorResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 是否已执行过搜索 */
  const [hasSearched, setHasSearched] = useState(false);

  /** 更新单个筛选条件 */
  const updateCriteria = useCallback(
    (patch: Partial<SelectorCriteria>) => {
      setCriteria((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  /** 重置筛选条件 */
  const resetCriteria = useCallback(() => {
    setCriteria(DEFAULT_CRITERIA);
    setResult(EMPTY_RESULT);
    setHasSearched(false);
    setError(null);
  }, []);

  /** 执行筛选 */
  const search = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stocks = await selectorRepository.fetchByCriteria(criteria);
      const filtered = SelectorService.filter(stocks, criteria);
      setResult(filtered);
      setHasSearched(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "筛选失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [criteria]);

  return {
    criteria,
    updateCriteria,
    resetCriteria,
    result,
    loading,
    error,
    hasSearched,
    search,
  };
}
