/**
 * useStockChart — stock chart data with date-validated cache
 * K-line: per code+date, Timeshare: 5s auto-refresh
 * PreClose always from the last COMPLETE (settled) daily candle
 * Auto-merges today candle from timeshare when K-line is stale
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

/**
 * Get last complete candle's close as preClose.
 * If last date === today: today is incomplete -> preClose = second-to-last close
 * If last date < today: last IS the complete candle -> preClose = last close
 */
function calcPreClose(data: KLineDataPoint[], today: string): number {
  if (data.length === 0) return 0;
  const lastCandle = data[data.length - 1]!;
  if (lastCandle.date === today) {
    return data.length >= 2 ? data[data.length - 2]!.close : data[data.length - 1]!.close;
  }
  return lastCandle.close;
}

/**
 * Build synthetic today daily candle from timeshare data
 */
function buildTodayCandle(tsData: TimeshareDataPoint[], today: string, preClose: number): KLineDataPoint | null {
  if (tsData.length === 0 || preClose <= 0) return null;
  let open = tsData[0]!.price;
  let high = open, low = open, close = tsData[tsData.length - 1]!.price;
  let totalVol = 0;
  for (const pt of tsData) {
    if (pt.price > high) high = pt.price;
    if (pt.price < low) low = pt.price;
    totalVol += pt.volume ?? 0;
  }
  return { date: today, open, high, low, close, volume: totalVol };
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
  const rawKlineRef = useRef<KLineDataPoint[]>([]); // raw K-line without today merge
  const preCloseRef = useRef(0);

  const today = todayStr();

  // Load K-line
  const loadKline = useCallback(async (c: string) => {
    const cached = cache.getKline(c, today);
    if (cached) {
      rawKlineRef.current = cached.data as KLineDataPoint[];
      const pc = cached.preClose;
      setPreClose(pc);
      preCloseRef.current = pc;
      setKlineData(cached.data as KLineDataPoint[]);
      setKlineDate(cached.dataDate);
      return;
    }
    setKlineLoading(true);
    try {
      const data = await fetchStockKLine(c, 60);
      if (data.length === 0) { setKlineLoading(false); return; }

      const pc = calcPreClose(data, today);
      const lastDate = data[data.length - 1]!.date;

      rawKlineRef.current = data;
      setPreClose(pc);
      preCloseRef.current = pc;
      setKlineData(data);
      setKlineDate(lastDate);
      cache.setKline(c, data, pc, today);
    } catch (err) {
      console.error("K-line failed:", err);
    } finally {
      setKlineLoading(false);
    }
  }, [cache, today]);

  // Load timeshare
  const loadTimeshare = useCallback(async (c: string, force = false) => {
    if (!force && !cache.isTimeshareStale(c, today)) {
      const cached = cache.getTimeshare(c, today);
      if (cached) {
        setTimeshareData(cached.data as TimeshareDataPoint[]);
        if (cached.preClose > 0 && preCloseRef.current === 0) {
          setPreClose(cached.preClose);
          preCloseRef.current = cached.preClose;
        }
        setTsDate(cached.dataDate);
        return;
      }
    }
    setTsLoading(true);
    try {
      const { data, preClose: pc } = await fetchStockTimeshare(c);
      if (data.length > 0) {
        setTimeshareData(data);
        // K-line preClose takes priority for date alignment
        if (preCloseRef.current === 0 && pc > 0) {
          setPreClose(pc);
          preCloseRef.current = pc;
        }
        setTsDate(today);
        cache.setTimeshare(c, data, preCloseRef.current > 0 ? preCloseRef.current : (pc > 0 ? pc : 0), today);
      }
    } catch (err) {
      console.error("Timeshare failed:", err);
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
      console.error("Concept failed:", err);
    } finally {
      setConceptLoading(false);
    }
  }, []);

  // Merge today candle into K-line when raw K-line lacks today but timeshare has data
  useEffect(() => {
    const raw = rawKlineRef.current;
    const ts = timeshareData;
    if (raw.length === 0 || ts.length === 0) return;

    const lastKlineDate = raw[raw.length - 1]!.date;
    if (lastKlineDate === today) {
      // K-line already has today, no merge needed
      // But update the last candle with latest timeshare info
      const todayCandle = buildTodayCandle(ts, today, preCloseRef.current);
      if (todayCandle) {
        const merged = [...raw.slice(0, -1), todayCandle];
        setKlineData(merged);
      }
      return;
    }

    // K-line ends at yesterday or earlier, append today candle
    if (lastKlineDate < today && preCloseRef.current > 0) {
      const todayCandle = buildTodayCandle(ts, today, preCloseRef.current);
      if (todayCandle) {
        const merged = [...raw, todayCandle];
        setKlineData(merged);
        setKlineDate(today);
      }
    }
  }, [timeshareData]);

  // Initial load
  useEffect(() => {
    if (!code) return;
    codeRef.current = code;
    setError(null);
    void loadKline(code);
    void loadTimeshare(code);
    void loadConcepts(code);
  }, [code, loadKline, loadTimeshare, loadConcepts]);

  // Auto-refresh timeshare during trading
  useEffect(() => {
    if (!code || !isTradingHours()) return;
    const timer = setInterval(() => { void loadTimeshare(code, true); }, 5000);
    return () => clearInterval(timer);
  }, [code, loadTimeshare]);

  // Also refresh K-line every 60s during trading (in case new data arrives)
  useEffect(() => {
    if (!code || !isTradingHours()) return;
    const timer = setInterval(() => { void loadKline(code); }, 60000);
    return () => clearInterval(timer);
  }, [code, loadKline]);

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