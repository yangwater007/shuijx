/**
 * 板块轮动 Repository — 数据获取层
 * 直接调用 quicktiny REST API（生产环境 CORS 兼容）
 */

import type {
  SectorQuadrantResponse,
  StockQuadrantResponse,
  SectorQueryParams,
  StockQuadrantParams,
} from "@data/dto/sector";

const API = "https://stock.quicktiny.cn/api";

/** 获取板块象限分布数据 */
export async function fetchSectorQuadrant(params: SectorQueryParams): Promise<SectorQuadrantResponse> {
  const qs = new URLSearchParams({
    source: params.source,
    period: String(params.period),
    strengthPeriod: String(params.strengthPeriod),
  });
  const resp = await fetch(`${API}/sector-analysis/quadrant?${qs}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/** 获取指定板块的个股象限分布数据 */
export async function fetchStockQuadrant(params: StockQuadrantParams): Promise<StockQuadrantResponse> {
  const qs = new URLSearchParams({
    source: params.source,
    sector: params.sector,
    period: String(params.period),
    strengthPeriod: String(params.strengthPeriod),
  });
  const resp = await fetch(`${API}/sector-analysis/stock-quadrant?${qs}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/** 将四个象限数据拍平为统一数组（用于表格展示） */
export interface FlatSectorItem {
  name: string;
  todayChange: number;
  periodChange: number;
  recentChange: number;
  recentUpDays: number;
  recentTotalDays: number;
  stockCount: number;
  volumeRatio: number;
  positionInRange: number;
  positionPctRank: number;
  quadrant: "highStrong" | "highWeak" | "lowStrong" | "lowWeak";
}

export function flattenQuadrants(q: SectorQuadrantResponse["quadrants"]): FlatSectorItem[] {
  const quadrants: Array<keyof SectorQuadrantResponse["quadrants"]> = [
    "highStrong", "highWeak", "lowStrong", "lowWeak",
  ];
  return quadrants.flatMap((key) =>
    (q[key] ?? []).map((item) => ({ ...item, quadrant: key }))
  );
}