/** 服务层 — 题材库业务逻辑（纯函数） */

import type { Theme, ThemeCategory, ThemeData } from "@data/dto/theme";

/**
 * 按分类将题材分组
 */
function groupByCategory(themes: readonly Theme[]): ThemeCategory[] {
  const categoryMap = new Map<string, Theme[]>();

  for (const theme of themes) {
    const list = categoryMap.get(theme.category);
    if (list) {
      list.push(theme);
    } else {
      categoryMap.set(theme.category, [theme]);
    }
  }

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, categoryThemes]) => ({
      name,
      themes: categoryThemes.sort((a, b) => b.heat - a.heat),
    }));
}

/**
 * 按关键词搜索题材（名称模糊匹配）
 */
function search(themes: readonly Theme[], keyword: string): Theme[] {
  if (!keyword.trim()) return [...themes];
  const kw = keyword.toLowerCase();
  return themes.filter(
    (t) =>
      t.name.toLowerCase().includes(kw) ||
      t.description.toLowerCase().includes(kw)
  );
}

/**
 * 核心：处理题材列表数据
 */
function processThemeList(themes: readonly Theme[]): ThemeData {
  return {
    categories: groupByCategory(themes),
    allThemes: [...themes].sort((a, b) => b.heat - a.heat),
    total: themes.length,
    updatedAt: Date.now(),
  };
}

const ThemeService = {
  groupByCategory,
  search,
  processThemeList,
};

export default ThemeService;
