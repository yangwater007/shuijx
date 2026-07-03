/** 业务层 — 题材库 Hook */

import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchThemeGraph } from "@data/repository/themes";
import { sortByLimitUp, sortByStage, groupByCategory, filterThemes } from "@service/themes/ThemeService";
import type { ThemeGraphData, ThemeViewMode, ThemeEdge } from "@infra/types/themes";

const EMPTY: ThemeGraphData = { date: "", center: null, nodes: [], edges: [] };

export default function useThemeLibrary() {
  const [data, setData] = useState<ThemeGraphData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ThemeViewMode>("kpl");
  const [search, setSearch] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchThemeGraph();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // KPL 视图：按涨停数排序展示
  const kplNodes = useMemo(() => sortByLimitUp(data.nodes), [data.nodes]);

  // Concept 视图：按分类分组
  const conceptGroups = useMemo(() => {
    const filtered = search ? filterThemes(data.nodes, search) : data.nodes;
    return groupByCategory(filtered);
  }, [data.nodes, search]);

  // Graph 视图：按阶段排序 + 选中主题关联边
  const graphNodes = useMemo(() => sortByStage(data.nodes), [data.nodes]);
  const graphEdges = useMemo(() => {
    if (!selectedTheme) return data.edges;
    return data.edges.filter(
      (e: ThemeEdge) => e.source === selectedTheme || e.target === selectedTheme
    );
  }, [data.edges, selectedTheme]);

  const selectTheme = useCallback((name: string | null) => setSelectedTheme(name), []);

  return {
    data, loading, error,
    view, setView,
    search, setSearch,
    selectedTheme, selectTheme,
    kplNodes, conceptGroups, graphNodes, graphEdges,
    refresh: load,
  };
}