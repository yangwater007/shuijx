/** 数据层 — 题材库 DTO */

import type { ThemeNode, ThemeEdge, ThemeGraphData } from "@infra/types/themes";

/** API 原始响应 */
export interface RawThemeGraphResponse {
  success: boolean;
  data: {
    date: string;
    center: null;
    nodes: RawThemeNode[];
    edges: RawThemeEdge[];
  };
}

interface RawThemeNode {
  name: string;
  category: string;
  categoryInfo: { name: string; icon: string; color: string };
  limitUpCount: number;
  maxContinueNum: number;
  stage: string;
  stageLabel: string;
  dragonHead: { code: string; name: string; continueNum: number };
  change: { count: number; trend: string };
}

interface RawThemeEdge {
  source: string;
  target: string;
  type: string;
}

/** 将 Raw 转为 Domain */
export function mapRawThemeNode(raw: RawThemeNode): ThemeNode {
  return {
    name: raw.name,
    category: raw.category,
    categoryInfo: raw.categoryInfo,
    limitUpCount: raw.limitUpCount,
    maxContinueNum: raw.maxContinueNum,
    stage: raw.stage as ThemeNode["stage"],
    stageLabel: raw.stageLabel,
    dragonHead: raw.dragonHead,
    change: raw.change as ThemeNode["change"],
  };
}

export function mapRawThemeEdge(raw: RawThemeEdge): ThemeEdge {
  return {
    source: raw.source,
    target: raw.target,
    type: raw.type as ThemeEdge["type"],
  };
}

export function mapRawThemeGraph(raw: RawThemeGraphResponse): ThemeGraphData {
  return {
    date: raw.data.date,
    center: null,
    nodes: raw.data.nodes.map(mapRawThemeNode),
    edges: raw.data.edges.map(mapRawThemeEdge),
  };
}