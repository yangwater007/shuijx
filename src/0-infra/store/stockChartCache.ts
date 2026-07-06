/**
 * StockChartCache — Zustand stock chart data cache with date validation
 * K-line cached by code+date, timeshare 5s TTL with date check
 */
import { create } from "zustand";

interface CacheEntry<T> {
  data: T;
  preClose: number;
  dataDate: string;
  updatedAt: number;
}

interface State {
  kline: Record<string, CacheEntry<unknown[]>>;
  timeshare: Record<string, CacheEntry<unknown[]>>;
  setKline: (code: string, data: unknown[], preClose: number, dataDate: string) => void;
  setTimeshare: (code: string, data: unknown[], preClose: number, dataDate: string) => void;
  getKline: (code: string, today: string) => CacheEntry<unknown[]> | null;
  getTimeshare: (code: string, today: string) => CacheEntry<unknown[]> | null;
  isTimeshareStale: (code: string, today: string) => boolean;
  clear: (code: string) => void;
}

const TS_TTL = 5_000;

function todayStr(): string {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

function makeKey(code: string, date: string): string {
  return code + "@" + date;
}

export const useStockChartCache = create<State>((set, get) => ({
  kline: {},
  timeshare: {},

  setKline: (code, data, preClose, dataDate) =>
    set((s) => ({
      kline: { ...s.kline, [makeKey(code, dataDate)]: { data, preClose, dataDate, updatedAt: Date.now() } },
    })),

  setTimeshare: (code, data, preClose, dataDate) =>
    set((s) => ({
      timeshare: { ...s.timeshare, [makeKey(code, dataDate)]: { data, preClose, dataDate, updatedAt: Date.now() } },
    })),

  getKline: (code, date) => get().kline[makeKey(code, date)] ?? null,

  getTimeshare: (code, date) => get().timeshare[makeKey(code, date)] ?? null,

  isTimeshareStale: (code, date) => {
    const e = get().timeshare[makeKey(code, date)];
    if (!e) return true;
    return Date.now() - e.updatedAt > TS_TTL;
  },

  clear: (code) =>
    set((s) => {
      const prefix = code + "@";
      const rk: Record<string, CacheEntry<unknown[]>> = {};
      const rt: Record<string, CacheEntry<unknown[]>> = {};
      for (const key in s.kline) { if (!key.startsWith(prefix)) rk[key] = s.kline[key]!; }
      for (const key in s.timeshare) { if (!key.startsWith(prefix)) rt[key] = s.timeshare[key]!; }
      return { kline: rk, timeshare: rt };
    }),

  todayStr,
}));
