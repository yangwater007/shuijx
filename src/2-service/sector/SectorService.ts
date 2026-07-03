/**
 * SectorService — 板块轮动纯业务逻辑
 * 不依赖 DOM / UI，纯函数可独立测试
 */

import type {
  SectorQuadrantItem,
} from "@data/dto/sector";

/** 象限标签映射 */
const QUADRANT_LABELS: Record<string, string> = {
  highStrong: "领涨",
  highWeak: "补涨",
  lowStrong: "滞涨",
  lowWeak: "领跌",
};

/** 象限颜色映射 */
const QUADRANT_COLORS: Record<string, string> = {
  highStrong: "#ef4444",
  highWeak: "#f59e0b",
  lowStrong: "#3b82f6",
  lowWeak: "#22c55e",
};

/** 排序方向 */
export type SortField = "name" | "recentChange" | "periodChange" | "todayChange" | "volumeRatio" | "stockCount";
export type SortDir = "asc" | "desc";

/** 可排序/可过滤的通用项（SectorQuadrantItem 和 FlatSectorItem 都满足） */
interface SortableItem {
  name: string;
  recentChange: number;
  periodChange: number;
  todayChange: number;
  volumeRatio: number;
  stockCount: number;
}

/**
 * 按指定字段排序板块列表（泛型支持 FlatSectorItem）
 */
export function sortSectors<T extends SortableItem>(items: T[], field: SortField, dir: SortDir): T[] {
  const sorted = [...items].sort((a, b) => {
    const va = a[field];
    const vb = b[field];
    if (typeof va === "string") return va.localeCompare(vb as string);
    return (va as number) - (vb as number);
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

/**
 * 搜索过滤板块（泛型支持 FlatSectorItem）
 */
export function filterSectors<T extends SortableItem>(items: T[], keyword: string): T[] {
  if (!keyword.trim()) return items;
  const kw = keyword.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(kw));
}

/**
 * 获取象限中文标签
 */
export function getQuadrantLabel(quadrant: string): string {
  return QUADRANT_LABELS[quadrant] ?? quadrant;
}

/**
 * 获取象限颜色
 */
export function getQuadrantColor(quadrant: string): string {
  return QUADRANT_COLORS[quadrant] ?? "#6b7280";
}

/**
 * 计算象限统计摘要
 */
export function getQuadrantSummary(items: SectorQuadrantItem[]): {
  totalSectors: number;
  avgRecentChange: number;
  maxRecentChange: number;
  minRecentChange: number;
} {
  if (items.length === 0) {
    return { totalSectors: 0, avgRecentChange: 0, maxRecentChange: 0, minRecentChange: 0 };
  }
  const changes = items.map((i) => i.recentChange);
  return {
    totalSectors: items.length,
    avgRecentChange: +(changes.reduce((a, b) => a + b, 0) / changes.length).toFixed(2),
    maxRecentChange: Math.max(...changes),
    minRecentChange: Math.min(...changes),
  };
}

/**
 * 格式化金额
 */
export function formatSectorAmount(amount: number): string {
  if (amount >= 1e8) return `${(amount / 1e8).toFixed(2)}亿`;
  if (amount >= 1e4) return `${(amount / 1e4).toFixed(0)}万`;
  return amount.toFixed(0);
}

/**
 * 格式化市值
 */
export function formatSectorMv(mv: number): string {
  if (mv >= 1e8) return `${(mv / 1e8).toFixed(1)}亿`;
  if (mv >= 1e4) return `${(mv / 1e4).toFixed(0)}万`;
  return mv.toFixed(0);
}
