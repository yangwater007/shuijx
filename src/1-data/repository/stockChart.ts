/**
 * StockChartRepository — 个股K线/分时/题材数据获取
 * 主数据源：同花顺 (10jqka.com.cn)
 * 备用数据源：东方财富
 */

import {
  EASTMONEY_KL_API, EASTMONEY_TS_API, EASTMONEY_REFERER,
  TONGHUASHUN_KL_BASE, TONGHUASHUN_TS_BASE,
} from "@infra/config";
import type { KLineDataPoint, TimeshareDataPoint, KLineRawResponse, TimeshareRawResponse } from "@infra/types/chart";

// ─── 同花顺数据解析 ──────────────────────────────

function parseTHSKLine(line: string): KLineDataPoint | null {
  const parts = line.split(",");
  if (parts.length < 6) return null;
  return {
    date: parts[0]!,
    open: parseFloat(parts[1]!),
    close: parseFloat(parts[4]!),
    high: parseFloat(parts[2]!),
    low: parseFloat(parts[3]!),
    volume: parseInt(parts[5]!, 10),
  };
}

function parseTHSTimeshare(line: string): TimeshareDataPoint | null {
  const parts = line.split(",");
  if (parts.length < 5) return null;
  return {
    time: parts[0]!,
    price: parseFloat(parts[1]!),
    avgPrice: parseFloat(parts[3]!),
    volume: parseInt(parts[4]!, 10),
  };
}

function getTHSMarketPrefix(code: string): string {
  if (code.startsWith("6")) return "hs";
  if (code.startsWith("0") || code.startsWith("3") || code.startsWith("2")) return "sz";
  if (code.startsWith("4") || code.startsWith("8")) return "bj";
  return "hs";
}

function buildTHSUrl(type: "kline" | "timeshare", code: string): string {
  const market = getTHSMarketPrefix(code);
  if (type === "kline") {
    return TONGHUASHUN_KL_BASE + "/" + market + "_" + code + "/01/last.js";
  }
  return TONGHUASHUN_TS_BASE + "/" + market + "_" + code + "/last.js";
}

function parseTHSResponse(raw: string): Record<string, unknown> | null {
  try {
    const json = raw.replace(/^[^(]*\(/, "").replace(/\)\s*$/, "");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── 东方财富 fallback ──────────────────────────

function getSecId(code: string): string {
  const prefix = code.startsWith("6") ? "1" : "0";
  return prefix + "." + code;
}

function parseEMKLineRaw(raw: string): KLineDataPoint | null {
  const parts = raw.split(",");
  if (parts.length < 6) return null;
  return {
    date: parts[0]!,
    open: parseFloat(parts[1]!),
    close: parseFloat(parts[2]!),
    high: parseFloat(parts[3]!),
    low: parseFloat(parts[4]!),
    volume: parseInt(parts[5]!, 10),
  };
}

function parseEMTimeshareRaw(raw: string): TimeshareDataPoint | null {
  const parts = raw.split(",");
  if (parts.length < 8) return null;
  return {
    time: parts[0]!,
    price: parseFloat(parts[1]!),
    avgPrice: parseFloat(parts[7]!),
    volume: parseInt(parts[5]!, 10),
  };
}

function buildUrl(base: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  return base + "?" + search;
}

// ─── 核心获取函数 ──────────────────────────────

export async function fetchStockKLine(code: string, count = 60): Promise<KLineDataPoint[]> {
  try {
    const resp = await fetch(buildTHSUrl("kline", code));
    if (!resp.ok) throw new Error("THS HTTP " + resp.status);
    const text = await resp.text();
    const parsed = parseTHSResponse(text);
    if (parsed?.data) {
      const raw = parsed.data as string;
      const lines = raw.split(";").filter(Boolean);
      const sliced = lines.slice(-count);
      const result = sliced.map(parseTHSKLine).filter((d): d is KLineDataPoint => d !== null);
      if (result.length > 0) return result;
    }
  } catch { /* fallback */ }

  try {
    const secid = getSecId(code);
    const url = buildUrl(EASTMONEY_KL_API, {
      secid,
      fields1: "f1,f2,f3,f4,f5,f6",
      fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
      klt: "101",
      fqt: "1",
      end: "20500101",
      lmt: String(count),
    });
    const resp = await fetch(url, {
      headers: import.meta.env.DEV ? { Referer: EASTMONEY_REFERER } : {},
    });
    if (!resp.ok) throw new Error("EM HTTP " + resp.status);
    const json = (await resp.json()) as KLineRawResponse;
    if (json.data?.klines?.length) {
      return json.data.klines.map(parseEMKLineRaw).filter((d): d is KLineDataPoint => d !== null);
    }
  } catch { /* both failed */ }

  return [];
}

export async function fetchStockTimeshare(code: string): Promise<{ data: TimeshareDataPoint[]; preClose: number }> {
  try {
    const resp = await fetch(buildTHSUrl("timeshare", code));
    if (!resp.ok) throw new Error("THS HTTP " + resp.status);
    const text = await resp.text();
    const parsed = parseTHSResponse(text);
    if (parsed) {
      const key = Object.keys(parsed).find((k) => k.includes("_") && parsed[k] && typeof parsed[k] === "object");
      const payload = key ? (parsed[key] as Record<string, unknown>) : (parsed as Record<string, unknown>);

      if (payload?.data && typeof payload.data === "string") {
        const lines = payload.data.split(";").filter(Boolean);
        const data = lines.map(parseTHSTimeshare).filter((d): d is TimeshareDataPoint => d !== null);

        let preClose = 0;
        try {
          const klResp = await fetch(buildTHSUrl("kline", code));
          const klText = await klResp.text();
          const klParsed = parseTHSResponse(klText);
          if (klParsed?.data) {
            const klRaw = klParsed.data as string;
            const klLines = klRaw.split(";").filter(Boolean);
            if (klLines.length > 0) {
              const lastLine = klLines[klLines.length - 1]!;
              const parts = lastLine.split(",");
              if (parts.length >= 5) preClose = parseFloat(parts[4]!);
            }
          }
        } catch { /* ignore */ }

        return { data, preClose };
      }
    }
  } catch { /* fallback */ }

  try {
    const secid = getSecId(code);
    const url = buildUrl(EASTMONEY_TS_API, {
      secid,
      fields1: "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13",
      fields2: "f51,f52,f53,f54,f55,f56,f57,f58",
    });
    const resp = await fetch(url, {
      headers: import.meta.env.DEV ? { Referer: EASTMONEY_REFERER } : {},
    });
    if (!resp.ok) throw new Error("EM HTTP " + resp.status);
    const json = (await resp.json()) as TimeshareRawResponse;
    if (json.data?.trends?.length) {
      const data = json.data.trends.map(parseEMTimeshareRaw).filter((d): d is TimeshareDataPoint => d !== null);
      return { data, preClose: json.data.preClose ?? 0 };
    }
  } catch { /* both failed */ }

  return { data: [], preClose: 0 };
}

export interface StockConceptInfo {
  concept: string;
  reasonType: string;
  reasonInfo: string;
  analysis: string;
}

export async function fetchStockConcepts(code: string): Promise<StockConceptInfo | null> {
  // 1. 从连板天梯 API 查找涨停原因
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
                reasonType: (found.changeColor as string) === "red" ? "涨停" : "跌停",
                reasonInfo: (found.price as string) ?? "",
                analysis: (found.main_business as string) ?? "",
              };
            }
          }
        }
      }
    }
  } catch { /* continue to themes */ }

  // 2. 从题材图谱 API 查找关联题材
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/themes/graph");
    if (resp.ok) {
      const json = await resp.json() as Record<string, unknown>;
      const data = json.data as Record<string, unknown> | undefined;
      const nodes = data?.nodes as Array<Record<string, unknown>> | undefined;
      if (nodes) {
        // 查找该股是否是某个题材的龙头
        const relatedThemes: string[] = [];
        for (const node of nodes) {
          const dh = node.dragonHead as Record<string, unknown> | null;
          if (dh && dh.code === code) {
            relatedThemes.push((node.name as string) + "（" + (dh.continueNum ?? "?") + "板龙头）");
          }
        }
        if (relatedThemes.length > 0) {
          return {
            concept: relatedThemes.join("、"),
            reasonType: "题材龙头",
            reasonInfo: "关联" + relatedThemes.length + "个题材",
            analysis: "该股票是以下题材的龙头股，在题材轮动中具有标志性意义。",
          };
        }
      }
    }
  } catch { /* ignore */ }

  return null;
}
