/**
 * StockChartCache — Zustand stock chart data cache
 * K-line cached by date (daily), timeshare auto-refreshed every 5s during trading
 */
import { create } from "zustand";

interface Entry<T> {
  data: T;
  preClose: number;
  updatedAt: number;
}

interface State {
  kline: Record<string, Entry<unknown[]>>;
  timeshare: Record<string, Entry<unknown[]>>;
  setKline: (code: string, data: unknown[], preClose: number) => void;
  setTimeshare: (code: string, data: unknown[], preClose: number) => void;
  getKline: (code: string) => Entry<unknown[]> | null;
  getTimeshare: (code: string) => Entry<unknown[]> | null;
  isTimeshareStale: (code: string) => boolean;
  clear: (code: string) => void;
}

const TS_TTL = 10_000;

export const useStockChartCache = create<State>((set, get) => ({
  kline: {},
  timeshare: {},

  setKline: (code, data, preClose) =>
    set((s) => ({ kline: { ...s.kline, [code]: { data, preClose, updatedAt: Date.now() } } })),

  setTimeshare: (code, data, preClose) =>
    set((s) => ({ timeshare: { ...s.timeshare, [code]: { data, preClose, updatedAt: Date.now() } } })),

  getKline: (code) => get().kline[code] ?? null,

  getTimeshare: (code) => get().timeshare[code] ?? null,

  isTimeshareStale: (code) => {
    const e = get().timeshare[code];
    if (!e) return true;
    return Date.now() - e.updatedAt > TS_TTL;
  },

  clear: (code) =>
    set((s) => {
      const { [code]: _, ...rk } = s.kline;
      const { [code]: __, ...rt } = s.timeshare;
      return { kline: rk, timeshare: rt };
    }),
}));
