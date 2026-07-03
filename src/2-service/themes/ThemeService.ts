/** 服务层 — 题材库业务逻辑（纯函数） */

import type { ThemeNode, ThemeEdge } from "@infra/types/themes";
import { STAGE_COLORS } from "@infra/types/themes";

/** 按涨停数降序排列 */
export function sortByLimitUp(nodes: readonly ThemeNode[]): ThemeNode[] {
  return [...nodes].sort((a, b) => b.limitUpCount - a.limitUpCount);
}

/** 按阶段排序（高潮 → 发酵 → 分歧 → 退潮） */
const STAGE_ORDER: Record<string, number> = { climax: 0, rising: 1, divergence: 2, fading: 3 };
export function sortByStage(nodes: readonly ThemeNode[]): ThemeNode[] {
  return [...nodes].sort((a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9));
}

/** 按分类分组 */
export function groupByCategory(nodes: readonly ThemeNode[]): Map<string, ThemeNode[]> {
  const map = new Map<string, ThemeNode[]>();
  for (const node of nodes) {
    const key = node.categoryInfo.name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(node);
  }
  // 每组内按涨停数排序
  for (const [, list] of map) list.sort((a, b) => b.limitUpCount - a.limitUpCount);
  return map;
}

/** 搜索过滤 */
export function filterThemes(nodes: readonly ThemeNode[], keyword: string): ThemeNode[] {
  if (!keyword.trim()) return [...nodes];
  const kw = keyword.trim().toLowerCase();
  return nodes.filter(
    (n) => n.name.toLowerCase().includes(kw) || n.dragonHead?.name?.toLowerCase().includes(kw)
  );
}

/** 获取阶段颜色 */
export function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? "#6b7280";
}

/** 获取趋势图标 */
export function getTrendIcon(trend: string): string {
  return trend === "rising" ? "↑" : trend === "falling" ? "↓" : "→";
}

/** 获取趋势颜色 */
export function getTrendColor(trend: string): string {
  return trend === "rising" ? "#ef4444" : trend === "falling" ? "#22c55e" : "#6b7280";
}

/** 获取关联边（给定主题名） */
export function getRelatedEdges(edges: readonly ThemeEdge[], themeName: string): ThemeEdge[] {
  return edges.filter((e) => e.source === themeName || e.target === themeName);
}