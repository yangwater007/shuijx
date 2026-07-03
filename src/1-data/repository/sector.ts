/**
 * 板块轮动 Repository — 数据获取层
 * 代理 quicktiny API 获取板块象限与个股象限数据
 */

import http from "@infra/http/index";
import type {
  SectorQuadrantResponse,
  StockQuadrantResponse,
  SectorQueryParams,
  StockQuadrantParams,
} from "@data/dto/sector";

const BASE = "/sector-analysis";

/** 获取板块象限分布数据 */
export async function fetchSectorQuadrant(params: SectorQueryParams): Promise<SectorQuadrantResponse> {
  const res = await http.get<SectorQuadrantResponse>(`${BASE}/quadrant`, { params });
  return res.data;
}

/** 获取指定板块的个股象限分布数据 */
export async function fetchStockQuadrant(params: StockQuadrantParams): Promise<StockQuadrantResponse> {
  const res = await http.get<StockQuadrantResponse>(`${BASE}/stock-quadrant`, { params });
  return res.data;
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
    q[key].map((item) => ({ ...item, quadrant: key }))
  );
}
