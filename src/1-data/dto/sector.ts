/**
 * 板块轮动 DTO — API 响应类型（100% 对齐 quicktiny API）
 *
 * API 端点:
 *   GET /api/sector-analysis/quadrant?source=industry&period=60&strengthPeriod=5
 *   GET /api/sector-analysis/stock-quadrant?source=industry&sector=XXX&period=60&strengthPeriod=5
 */

// ──────────────────────────────────────────────
// 象限图 — 板块级别
// ──────────────────────────────────────────────

/** 象限板块数据项 */
export interface SectorQuadrantItem {
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
}

/** 板块象限 API 响应 */
export interface SectorQuadrantResponse {
  quadrants: {
    highStrong: SectorQuadrantItem[];   // 领涨 — 右上
    highWeak: SectorQuadrantItem[];     // 补涨 — 左上
    lowStrong: SectorQuadrantItem[];    // 滞涨 — 右下
    lowWeak: SectorQuadrantItem[];      // 领跌 — 左下
  };
  meta: {
    source: string;
    sourceLabel: string;
    period: number;
    strengthPeriod: number;
    date: string;
    sectorCount: number;
    volumeAdjusted: boolean;
    volumeProgress: number;
  };
}

// ──────────────────────────────────────────────
// 象限图 — 个股级别（板块下钻）
// ──────────────────────────────────────────────

/** 个股象限数据项 */
export interface StockQuadrantItem {
  name: string;
  code: string;
  tsCode: string;
  industry: string;
  close: number;
  todayChange: number;
  periodChange: number;
  recentChange: number;
  recentUpDays: number;
  recentTotalDays: number;
  volumeRatio: number;
  positionInRange: number;
  amount: number;
  circMv: number;
  positionPctRank: number;
}

/** 个股象限 API 响应 */
export interface StockQuadrantResponse {
  sectorName: string;
  quadrants: {
    highStrong: StockQuadrantItem[];
    highWeak: StockQuadrantItem[];
    lowStrong: StockQuadrantItem[];
    lowWeak: StockQuadrantItem[];
  };
  meta: {
    source: string;
    sourceLabel: string;
    sectorName: string;
    period: number;
    strengthPeriod: number;
    date: string;
    stockCount: number;
    volumeAdjusted: boolean;
    volumeProgress: number;
  };
}

// ──────────────────────────────────────────────
// 查询参数
// ──────────────────────────────────────────────

export interface SectorQueryParams {
  source: string;          // 数据源: "industry" | "concept" | "region"
  period: number;          // 长周期天数: 60 | 30 | 20 | 10 | 5
  strengthPeriod: number;  // 短周期天数: 5 | 10
}

export interface StockQuadrantParams extends SectorQueryParams {
  sector: string;          // 板块名称
}
