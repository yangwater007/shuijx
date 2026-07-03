/** 业务层 — 题材库 Hook */

import { useState, useCallback, useEffect } from "react";
import themeRepository from "@data/repository/theme";
import ThemeService from "@service/theme/ThemeService";
import type { Theme, ThemeDetail, ThemeData } from "@data/dto/theme";

/** 初始空数据 */
const EMPTY_DATA: ThemeData = {
  categories: [],
  allThemes: [],
  total: 0,
  updatedAt: 0,
};

export default function useThemeLibrary() {
  const [data, setData] = useState<ThemeData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<ThemeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /** 加载题材列表 */
  const loadThemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const themes = await themeRepository.fetchThemeList();
      const processed = ThemeService.processThemeList(themes);
      setData(processed);
    } catch (err) {
      const message = err instanceof Error ? err.message : "加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    void loadThemes();
  }, [loadThemes]);

  /** 当前展示的题材（按搜索关键词过滤） */
  const displayThemes: Theme[] = searchKeyword
    ? ThemeService.search(data.allThemes, searchKeyword)
    : data.allThemes;

  /** 按搜索过滤后的分类 */
  const displayCategories = searchKeyword
    ? ThemeService.processThemeList(
        ThemeService.search(data.allThemes, searchKeyword)
      ).categories
    : data.categories;

  /** 选择题材查看详情 */
  const selectTheme = useCallback(async (themeId: string) => {
    setDetailLoading(true);
    try {
      const detail = await themeRepository.fetchThemeDetail(themeId);
      setSelectedDetail(detail);
    } catch (err) {
      console.error("加载题材详情失败", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /** 关闭详情 */
  const closeDetail = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  return {
    data,
    displayThemes,
    displayCategories,
    loading,
    error,
    searchKeyword,
    setSearchKeyword,
    selectedDetail,
    detailLoading,
    selectTheme,
    closeDetail,
    refresh: loadThemes,
  };
}
