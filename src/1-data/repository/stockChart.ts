/**
 * StockChartRepository ? ??K?/??/??????
 * ????????? (qt.gtimg.cn / web.ifzq.gtimg.cn)
 * ??/?????quicktiny ladder API + themes graph API
 */

import { TENCENT_KL_API, TENCENT_MINUTE_API, TENCENT_QUOTE_API } from "@infra/config";
import type { KLineDataPoint, TimeshareDataPoint } from "@infra/types/chart";

// ??????????????? ???????? ???????????????

/** ???????? (sh=??, sz=??, bj=???) */
function getTencentMarket(code: string): string {
  if (code.startsWith("6")) return "sh";
  if (code.startsWith("0") || code.startsWith("3") || code.startsWith("2")) return "sz";
  if (code.startsWith("4") || code.startsWith("8") || code.startsWith("9")) return "bj";
  return "sz";
}

/** ????K?: ["2026-07-10","1182.200","1204.980","1204.980","1170.280","52213.000"] */
function parseTencentKLine(raw: string[]): KLineDataPoint | null {
  if (raw.length < 6) return null;
  return {
    date: raw[0]!,
    open: parseFloat(raw[1]!),
    close: parseFloat(raw[2]!),
    high: parseFloat(raw[3]!),
    low: parseFloat(raw[4]!),
    volume: parseInt(raw[5]!, 10),
  };
}

/** ??????: "0930 1182.20 331 39130820.00" */
function parseTencentMinute(raw: string): TimeshareDataPoint | null {
  const parts = raw.split(" ");
  if (parts.length < 3) return null;
  return {
    time: parts[0]!,
    price: parseFloat(parts[1]!),
    volume: parseInt(parts[2]!, 10),
  };
}

/** ???????? (~??) */
function parseTencentQuote(raw: string): { preClose: number; name: string } | null {
  const inner = raw.split('"')[1];
  if (!inner) return null;
  const fields = inner.split("~");
  return {
    name: fields[1] ?? "",
    preClose: parseFloat(fields[4] ?? "0"),
  };
}

// ??????????????? ?????? ???????????????

export async function fetchStockKLine(code: string, count = 60): Promise<KLineDataPoint[]> {
  const market = getTencentMarket(code);
  const url = TENCENT_KL_API + "?param=" + market + code + ",day,,," + count + ",qfq";
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Tencent HTTP " + resp.status);
    const json = await resp.json() as Record<string, unknown>;
    const stockData = (json.data as Record<string, unknown>)?.[market + code] as Record<string, unknown>;
    if (!stockData) throw new Error("No stock data in response");
    const klines = (stockData.qfqday ?? stockData.day ?? []) as string[][];
    const result = klines.map(parseTencentKLine).filter((d): d is KLineDataPoint => d !== null);
    return result;
  } catch (e) {
    console.warn("[Tencent] K-line failed for " + code + ": " + (e instanceof Error ? e.message : String(e)));
    return [];
  }
}

export async function fetchStockTimeshare(code: string): Promise<{ data: TimeshareDataPoint[]; preClose: number }> {
  const market = getTencentMarket(code);
  const minuteUrl = TENCENT_MINUTE_API + "?code=" + market + code;
  const quoteUrl = TENCENT_QUOTE_API + "?q=" + market + code;
  try {
    // ?????? + ??
    const [minResp, quoteResp] = await Promise.all([
      fetch(minuteUrl).then(r => r.json()).catch(() => null),
      fetch(quoteUrl).then(r => r.text()).catch(() => null),
    ]);

    let preClose = 0;
    if (quoteResp) {
      const quote = parseTencentQuote(quoteResp);
      if (quote) preClose = quote.preClose;
    }

    if (!minResp) return { data: [], preClose };

    const minData = (minResp as Record<string, unknown>).data as Record<string, unknown> | undefined;
    const stockMin = minData?.[market + code] as Record<string, unknown> | undefined;
    const dataArr = (stockMin?.data ?? {}) as Record<string, unknown>;
    const rawLines = (dataArr?.data ?? []) as string[];

    const data = rawLines.map(parseTencentMinute).filter((d): d is TimeshareDataPoint => d !== null);
    return { data, preClose };
  } catch (e) {
    console.warn("[Tencent] Timeshare failed for " + code + ": " + (e instanceof Error ? e.message : String(e)));
    return { data: [], preClose: 0 };
  }
}

// ??????????????? ??/???? (????, ?????) ???????????????

export interface StockConceptInfo {
  concept: string;
  reasonType: string;
  reasonInfo: string;
  analysis: string;
}

export async function fetchStockConcepts(code: string): Promise<StockConceptInfo | null> {
  // 1. ????? API ??????
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/ladder");
    if (resp.ok) {
      const json = await resp.json() as Record<string, unknown>;
      const dates = json.dates as Array<Record<string, unknown>> | undefined;
      if (dates?.length) {
        const latest = dates[dates.length - 1];
        const boards = latest?.boards as Array<Record<string, unknown>> | undefined;
        if (boards) {
          for (const level of boards) {
            const stocks = level.stocks as Array<Record<string, unknown>>;
            if (!stocks) continue;
            const found = stocks.find((s) => s.code === code);
            if (found) {
              return {
                concept: (found.primary_theme as string) ?? (found.industry as string) ?? "",
                reasonType: (found.changeColor as string) === "red" ? "??" : "??",
                reasonInfo: (found.reason_info as string) ?? (found.price as string) ?? "",
                analysis: (found.main_business as string) ?? "",
              };
            }
          }
        }
      }
    }
  } catch { /* continue to themes */ }

  // 2. ????? API ??????
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/themes/graph");
    if (resp.ok) {
      const json = await resp.json() as Record<string, unknown>;
      const data = json.data as Record<string, unknown> | undefined;
      const nodes = data?.nodes as Array<Record<string, unknown>> | undefined;
      if (nodes) {
        const relatedThemes: string[] = [];
        for (const node of nodes) {
          const dh = node.dragonHead as Record<string, unknown> | null;
          if (dh && dh.code === code) {
            relatedThemes.push((node.name as string) + "?" + (dh.continueNum ?? "?") + "????");
          }
        }
        if (relatedThemes.length > 0) {
          return {
            concept: relatedThemes.join("?"),
            reasonType: "????",
            reasonInfo: "??" + relatedThemes.length + "???",
            analysis: "???????????????????????????",
          };
        }
      }
    }
  } catch { /* ignore */ }

  return null;
}
