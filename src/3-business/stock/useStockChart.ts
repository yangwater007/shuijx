/**
 * useStockChart — 个股图表数据 Hook
 * 组合 StockChartRepository 获取 K线 + 分时 + 题材数据
 * 主数据源：同花顺，fallback 东方财富
 */

import { useState, useEffect, useCallback } from "react";
import { fetchStockKLine, fetchStockTimeshare, fetchStockConcepts } from "@data/repository/stockChart";
import type { StockConceptInfo } from "@data/repository/stockChart";
import type { KLineDataPoint, TimeshareDataPoint } from "@infra/types/chart";

interface UseStockChartReturn {
  klineData: KLineDataPoint[];
  timeshareData: TimeshareDataPoint[];
  preClose: number;
  conceptInfo: StockConceptInfo | null;
  klineLoading: boolean;
  tsLoading: boolean;
  conceptLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useStockChart(code: string | undefined): UseStockChartReturn {
  const [klineData, setKlineData] = useState<KLineDataPoint[]>([]);
  const [timeshareData, setTimeshareData] = useState<TimeshareDataPoint[]>([]);
  const [preClose, setPreClose] = useState(0);
  const [conceptInfo, setConceptInfo] = useState<StockConceptInfo | null>(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [tsLoading, setTsLoading] = useState(false);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    setError(null);
    setKlineLoading(true);
    setTsLoading(true);
    setConceptLoading(true);

    const [kResult, tsResult, cResult] = await Promise.allSettled([
      fetchStockKLine(code, 60),
      fetchStockTimeshare(code),
      fetchStockConcepts(code),
    ]);

    if (kResult.status === "fulfilled") {
      setKlineData(kResult.value);
    } else {
      setKlineData([]);
    }

    if (tsResult.status === "fulfilled") {
      setTimeshareData(tsResult.value.data);
      setPreClose(tsResult.value.preClose);
    } else {
      setTimeshareData([]);
    }

    if (cResult.status === "fulfilled") {
      setConceptInfo(cResult.value);
    } else {
      setConceptInfo(null);
    }

    setKlineLoading(false);
    setTsLoading(false);
    setConceptLoading(false);
  }, [code]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    klineData, timeshareData, preClose, conceptInfo,
    klineLoading, tsLoading, conceptLoading,
    error, refresh: load,
  };
}
