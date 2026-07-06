/**
 * useStockChart — stock chart data Hook with date-validated Zustand cache
 * K-line: cached per code+date, timeshare: 5s auto-refresh with date check
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { fetchStockKLine, fetchStockTimeshare, fetchStockConcepts } from "@data/repository/stockChart";
import type { StockConceptInfo } from "@data/repository/stockChart";
import type { KLineDataPoint, TimeshareDataPoint } from "@infra/types/chart";
import { useStockChartCache, todayStr } from "@infra/store/stockChartCache";

interface UseStockChartReturn {
  klineData: KLineDataPoint[];
  timeshareData: TimeshareDataPoint[];
  preClose: number;
  conceptInfo: StockConceptInfo | null;
  klineLoading: boolean;
  tsLoading: boolean;
  conceptLoading: boolean;
  /** 数据日期（YYYYMMDD），用于判断是否为最新交易日数据 */
  klineDate: string;
  tsDate: string;
  error: string | null;
  refresh: () => void;
}

function isTradingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  return (m >= 570 && m <= 690) || (m >= 780 && m <= 900);
}

/** 解析同花顺 JSONP 响应 */
function parseTHS(raw: string): Record<string, unknown> | null {
  try {
    const json = raw.replace(/^[^(]*\(/, "").replace(/\)\s*$/, "");
    return JSON.parse(json) as Record<string, unknown>;
  } catch { return null; }
}

/** 从同花顺 K-line 响应中提取最新日期 */
async function getLatestKLineDate(code: string): Promise<string> {
  try {
    const market = code.startsWith("6") ? "hs" : (code.startsWith("4") || code.startsWith("8") ? "bj" : "sz");
    const resp = await fetch("https://d.10jqka.com.cn/v2/line/" + market + "_" + code + "/01/last.js");
    const text = await resp.text();
    const parsed = parseTHS(text);
    if (parsed?.data) {
      const lines = (parsed.data as string).split(";").filter(Boolean);
      if (lines.length > 0) {
        return lines[lines.length - 1]!.split(",")[0]!;
      }
    }
  } catch { /* ignore */ }
  return "";
}

/** 从同花顺 timeshare 响应中提取日期 */
async function getTimeshareDate(code: string): Promise<string> {
  try {
    const market = code.startsWith("6") ? "hs" : (code.startsWith("4") || code.startsWith("8") ? "bj" : "sz");
    const resp = await fetch("https://d.10jqka.com.cn/v2/time/" + market + "_" + code + "/last.js");
    const text = await resp.text();
    const parsed = parseTHS(text);
    if (parsed) {
      const key = Object.keys(parsed).find((k) => k.includes("_"));
      const payload = key ? (parsed[key] as Record<string, unknown>) : (parsed as Record<string, unknown>);
      return (payload?.date as string) ?? "";
    }
  } catch { /* ignore */ }
  return "";
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
  const [klineDate, setKlineDate] = useState("");
  const [tsDate, setTsDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef(code);

  const today = todayStr();

  // Load K-line (date-validated cache)
  const loadKline = useCallback(async (c: string) => {
    const cached = cache.getKline(c, today);
    if (cached) {
      setKlineData(cached.data as KLineDataPoint[]);
      setPreClose(cached.preClose);
      setKlineDate(cached.dataDate);
      return;
    }
    setKlineLoading(true);
    try {
      const data = await fetchStockKLine(c, 60);
      // Use last complete candle as preClose (skip today if it's intraday)
      const lastClose = data.length >= 2 ? data[data.length - 2]!.close : (data[0]?.close ?? 0);
      const dataDate = data.length > 0 ? data[data.length - 1]!.date : today;
      setKlineData(data);
      setPreClose(lastClose);
      setKlineDate(dataDate);
      cache.setKline(c, data, lastClose, today);
    } catch (err) {
      console.error("K-line fetch failed:", err);
    } finally {
      setKlineLoading(false);
    }
  }, [cache, today]);

  // Load timeshare (date-validated, auto-refresh)
  const loadTimeshare = useCallback(async (c: string, force = false) => {
    if (!force && !cache.isTimeshareStale(c, today)) {
      const cached = cache.getTimeshare(c, today);
      if (cached) {
        setTimeshareData(cached.data as TimeshareDataPoint[]);
        setPreClose((prev) => cached.preClose || prev);
        setTsDate(cached.dataDate);
        return;
      }
    }
    setTsLoading(true);
    try {
      const { data, preClose: pc } = await fetchStockTimeshare(c);
      if (data.length > 0) {
        setTimeshareData(data);
        if (pc > 0) setPreClose(pc);
        setTsDate(today);
        cache.setTimeshare(c, data, pc, today);
      }
    } catch (err) {
      console.error("Timeshare fetch failed:", err);
    } finally {
      setTsLoading(false);
    }
  }, [cache, today]);

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
    klineDate, tsDate,
    error, refresh,
  };
}
