/** 服务层 — 题材演化业务逻辑（纯函数） */

import type { ThemeEvoNode, EvoPath, ThemeEvoChild, EvoChildType, EvoStepNode, EvoStock } from "@infra/types/themeEvolution";
import type { ThemeEvolutionData, SelectedThemeNode } from "@data/dto/themeEvolution";
import { EVO_CHILD_LABELS } from "@infra/types/themeEvolution";

/** 按子类型查找子项 */
function findChild(node: ThemeEvoNode, childType: EvoChildType): ThemeEvoChild | undefined {
  return node.children.find((c) => c.type === childType);
}

/** 展平所有主题节点为可选列表 */
function flattenNodes(nodes: readonly ThemeEvoNode[]): SelectedThemeNode[] {
  const result: SelectedThemeNode[] = [];
  for (const node of nodes) {
    for (const child of node.children) {
      result.push({
        themeId: node.id,
        themeName: node.name,
        childType: child.type,
      });
    }
  }
  return result;
}

/** 获取选中主题相关的路径 */
function getRelatedPaths(
  paths: readonly EvoPath[],
  selected: SelectedThemeNode | null
): EvoPath[] {
  if (!selected) return [...paths];
  return paths.filter((p) =>
    p.steps.some((s) => s.theme === selected.themeId && s.childType === selected.childType)
  );
}

/** 突出显示选中节点（标记激活状态） */
interface StepWithActive extends EvoStepNode {
  isActive: boolean;
}

interface PathWithActive {
  steps: StepWithActive[];
}

function markActiveSteps(
  paths: readonly EvoPath[],
  selected: SelectedThemeNode | null
): PathWithActive[] {
  return paths.map((path) => ({
    steps: path.steps.map((step) => ({
      ...step,
      isActive: selected
        ? step.theme === selected.themeId && step.childType === selected.childType
        : false,
    })),
  }));
}

/** 获取子类型显示标签 */
function getChildTypeLabel(childType: EvoChildType): string {
  return EVO_CHILD_LABELS[childType];
}

/** 获取子类型颜色映射 */
function getChildTypeColor(childType: EvoChildType): string {
  switch (childType) {
    case "leader":
      return "#f6b26b";
    case "follower":
      return "#3b82f6";
    case "diffusion":
      return "#22c55e";
    default:
      return "#94a3b8";
  }
}

/** 根据选中节点获取该节点下的个股列表 */
function getSelectedStocks(
  data: ThemeEvolutionData,
  selected: SelectedThemeNode | null
): EvoStock[] {
  if (!selected) return [];
  const node = data.nodes.find((n) => n.id === selected.themeId);
  if (!node) return [];
  const child = node.children.find((c) => c.type === selected.childType);
  return child?.stocks ?? [];
}

/** 根据选中节点从路径中获取个股（优先路径中的 stocks） */
function getSelectedStocksFromPaths(
  paths: readonly EvoPath[],
  selected: SelectedThemeNode | null
): EvoStock[] {
  if (!selected) return [];
  for (const path of paths) {
    for (const step of path.steps) {
      if (step.theme === selected.themeId && step.childType === selected.childType) {
        return step.stocks ?? [];
      }
    }
  }
  return [];
}

/** 格式化成交额 */
function formatAmount(amount: number): string {
  if (amount >= 1e8) return `${(amount / 1e8).toFixed(2)}亿`;
  if (amount >= 1e4) return `${(amount / 1e4).toFixed(0)}万`;
  return String(amount);
}

/** 格式化涨跌幅 */
function formatChangeRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(2)}%`;
}

/** 按金额排序个股 */
function sortStocksByAmount(stocks: readonly EvoStock[]): EvoStock[] {
  return [...stocks].sort((a, b) => b.tradingAmount - a.tradingAmount);
}

/** 过滤个股（按名称/代码模糊搜索） */
function filterStocks(stocks: readonly EvoStock[], keyword: string): EvoStock[] {
  if (!keyword.trim()) return [...stocks];
  const kw = keyword.trim().toLowerCase();
  return stocks.filter(
    (s) => s.code.includes(kw) || s.name.toLowerCase().includes(kw)
  );
}

const ThemeEvolutionService = {
  findChild,
  flattenNodes,
  getRelatedPaths,
  markActiveSteps,
  getChildTypeLabel,
  getChildTypeColor,
  getSelectedStocks,
  getSelectedStocksFromPaths,
  formatAmount,
  formatChangeRate,
  sortStocksByAmount,
  filterStocks,
};

export default ThemeEvolutionService;

export type { StepWithActive, PathWithActive };
