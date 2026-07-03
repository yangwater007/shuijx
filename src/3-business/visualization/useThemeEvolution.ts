/** 业务层 — 题材演化 Hook */

import { useState, useCallback, useEffect, useMemo } from "react";
import themeEvolutionRepository from "@data/repository/themeEvolution";
import ThemeEvolutionService from "@service/theme/ThemeEvolutionService";
import type { ThemeEvolutionData, SelectedThemeNode } from "@data/dto/themeEvolution";
import type { EvoPath, EvoStock } from "@infra/types/themeEvolution";

/** 初始空数据 */
const EMPTY_DATA: ThemeEvolutionData = {
  nodes: [],
  paths: [],
  sankeyNodes: [],
  sankeyLinks: [],
  summary: null,
  updatedAt: 0,
};

export default function useThemeEvolution() {
  const [data, setData] = useState<ThemeEvolutionData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedThemeNode | null>(null);

  /** 加载数据 */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await themeEvolutionRepository.fetchThemeEvolution();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** 所有可选节点（扁平化） */
  const selectableNodes = useMemo(
    () => ThemeEvolutionService.flattenNodes(data.nodes),
    [data.nodes]
  );

  /** 当前展示的路径 */
  const displayPaths: EvoPath[] = useMemo(
    () => ThemeEvolutionService.getRelatedPaths(data.paths, selectedNode),
    [data.paths, selectedNode]
  );

  /** 带激活标记的路径 */
  const activePaths = useMemo(
    () => ThemeEvolutionService.markActiveSteps(displayPaths, selectedNode),
    [displayPaths, selectedNode]
  );

  /** 选中节点对应的个股列表 */
  const selectedStocks: EvoStock[] = useMemo(
    () => ThemeEvolutionService.getSelectedStocksFromPaths(displayPaths, selectedNode),
    [displayPaths, selectedNode]
  );

  /** 选择节点 */
  const selectNode = useCallback((node: SelectedThemeNode | null) => {
    setSelectedNode(node);
  }, []);

  /** 按ID选择节点 */
  const selectById = useCallback(
    (themeId: string, childType: SelectedThemeNode["childType"]) => {
      const node = data.nodes.find((n) => n.id === themeId);
      if (!node) return;
      setSelectedNode({
        themeId: node.id,
        themeName: node.name,
        childType,
      });
    },
    [data.nodes]
  );

  /** 清除选择 */
  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return {
    data,
    loading,
    error,
    selectedNode,
    selectableNodes,
    displayPaths,
    activePaths,
    selectedStocks,
    selectNode,
    selectById,
    clearSelection,
    refresh: loadData,
  };
}
