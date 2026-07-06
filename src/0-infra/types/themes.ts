/**
 * 基础设施层 — 题材库类型定义
 */

/** 题材节点（来自 /api/themes/graph） */
export interface ThemeNode {
  name: string;
  category: string;
  categoryInfo: ThemeCategory;
  limitUpCount: number;
  maxContinueNum: number;
  stage: "climax" | "rising" | "divergence" | "fading";
  stageLabel: string;
  dragonHead: ThemeDragonHead | null;
  change: ThemeChange;
}

/** 题材分类 */
export interface ThemeCategory {
  name: string;
  icon: string;
  color: string;
}

/** 龙头股 */
export interface ThemeDragonHead {
  code: string;
  name: string;
  continueNum: number;
}

/** 变化趋势 */
export interface ThemeChange {
  count: number;
  trend: "rising" | "falling" | "stable";
}

/** 关联边 */
export interface ThemeEdge {
  source: string;
  target: string;
  type: "upstream" | "downstream" | "related";
}

/** Graph API 完整响应 */
export interface ThemeGraphData {
  date: string;
  center: ThemeNode | null;
  nodes: ThemeNode[];
  edges: ThemeEdge[];
}

/** KPL 视图模式 */
export type ThemeViewMode = "kpl" | "concept" | "graph";

/** 视图配置 */
export const THEME_VIEWS: { key: ThemeViewMode; label: string; icon: string }[] = [
  { key: "kpl", label: "题材小表格", icon: "📊" },
  { key: "concept", label: "题材分类", icon: "📂" },
  { key: "graph", label: "题材挖掘", icon: "🔆" },
];

/** 阶段颜色映射 */
export const STAGE_COLORS: Record<string, string> = {
  climax: "#ef4444",
  rising: "#f59e0b",
  divergence: "#3b82f6",
  fading: "#6b7280",
};
