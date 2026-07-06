/**
 * useStockChart — stock chart data Hook with Zustand cache
 * K-line: cached daily, timeshare: 5s auto-refresh during trading
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockKLine, fetchStockTimeshare, fetchStockConcepts } from "@data/repository/stockChart";
import type { StockConceptInfo } from "@data/repository/stockChart";
import type { KLineDataPoint, TimeshareDataPoint } from "@infra/types/chart";
import { useStockChartCache } from "@infra/store/stockChartCache";

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

function isTradingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return (m >= 570 && m <= 690) || (m >= 780 && m <= 900); // 9:30-11:30, 13:00-15:00
}

export function useStockChart(code: string | undefined): UseStockChartReturn {
  const cache = useStockChartCache();
  const [klineData, setKlineData] = useState<KLineDataPoint[]>([]);
  const [timeshareData, setTimeshareData] = useState<TimeshareDataPoint[]>([]);
  const [preClose, setPreClose] = useState(0);
  const [conceptInfo, setConceptInfo] = useState<StockConceptInfo | null>(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [tsLoading, setTsLoading] = useState(false);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef(code);

  // Load K-line (cached)
  const loadKline = useCallback(async (c: string) => {
    const cached = cache.getKline(c);
    if (cached) {
      setKlineData(cached.data as KLineDataPoint[]);
      setPreClose(cached.preClose);
      return;
    }
    setKlineLoading(true);
    try {
      const data = await fetchStockKLine(c, 60);
      const pc = data.length >= 2 ? data[data.length - 2]!.close : (data[0]?.close ?? 0);
      setKlineData(data);
      setPreClose(pc);
      cache.setKline(c, data, pc);
    } catch (err) {
      console.error("K-line fetch failed:", err);
    } finally {
      setKlineLoading(false);
    }
  }, [cache]);

  // Load timeshare (cached, auto-refresh)
  const loadTimeshare = useCallback(async (c: string, force = false) => {
    if (!force && !cache.isTimeshareStale(c)) {
      const cached = cache.getTimeshare(c);
      if (cached) {
        setTimeshareData(cached.data as TimeshareDataPoint[]);
        setPreClose((prev) => cached.preClose || prev);
        return;
      }
    }
    setTsLoading(true);
    try {
      const { data, preClose: pc } = await fetchStockTimeshare(c);
      if (data.length > 0) {
        setTimeshareData(data);
        if (pc > 0) setPreClose(pc);
        cache.setTimeshare(c, data, pc);
      }
    } catch (err) {
      console.error("Timeshare fetch failed:", err);
    } finally {
      setTsLoading(false);
    }
  }, [cache]);

  // Load concepts
  const loadConcepts = useCallback(async (c: string) => {
    setConceptLoading(true);
    try {
      const info = await fetchStockConcepts(c);
      setConceptInfo(info);
    } catch (err) {
      console.error("Concept fetch failed:", err);
    } finally {
      setConceptLoading(false);
    }
  }, []);

  // Main load effect
  useEffect(() => {
    if (!code) return;
    codeRef.current = code;
    setError(null);

    void loadKline(code);
    void loadTimeshare(code);
    void loadConcepts(code);
  }, [code, loadKline, loadTimeshare, loadConcepts]);

  // Auto-refresh timeshare during trading (every 5s)
  useEffect(() => {
    if (!code || !isTradingHours()) return;
    const timer = setInterval(() => {
      void loadTimeshare(code, true);
    }, 5000);
    return () => clearInterval(timer);
  }, [code, loadTimeshare]);

  const refresh = useCallback(() => {
    const c = codeRef.current;
    if (!c) return;
    void loadKline(c);
    void loadTimeshare(c, true);
    void loadConcepts(c);
  }, [loadKline, loadTimeshare, loadConcepts]);

  return {
    klineData, timeshareData, preClose, conceptInfo,
    klineLoading, tsLoading, conceptLoading,
    error, refresh,
  };
}
