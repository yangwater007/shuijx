/**
 * useSectorAnalysis — 板块轮动业务 Hook
 * 组合 Repository + Service，暴露给 UI 层
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchSectorQuadrant, fetchStockQuadrant, flattenQuadrants, type FlatSectorItem } from "@data/repository/sector";
import { sortSectors, filterSectors } from "@service/sector/SectorService";
import type {
  SectorQuadrantResponse,
  StockQuadrantResponse,
  SectorQueryParams,
} from "@data/dto/sector";
import type { SortField, SortDir } from "@service/sector/SectorService";

interface UseSectorAnalysisReturn {
  /** 板块象限原始响应 */
  quadrantData: SectorQuadrantResponse | null;
  /** 拍平后的板块列表 */
  flatSectors: FlatSectorItem[];
  /** 过滤/排序后的展示列表 */
  displaySectors: FlatSectorItem[];
  /** 当前选中板块的个股数据 */
  stockQuadrant: StockQuadrantResponse | null;
  /** 加载状态 */
  loading: boolean;
  /** 个股加载状态 */
  stockLoading: boolean;
  /** 查询参数 */
  params: SectorQueryParams;
  /** 更新查询参数 */
  setParams: (p: Partial<SectorQueryParams>) => void;
  /** 搜索关键字 */
  keyword: string;
  /** 设置搜索关键字 */
  setKeyword: (k: string) => void;
  /** 选中板块（下钻个股） */
  selectedSector: string | null;
  /** 设置选中板块 */
  setSelectedSector: (s: string | null) => void;
  /** 排序 */
  sortField: SortField;
  sortDir: SortDir;
  setSort: (field: SortField, dir: SortDir) => void;
  /** 刷新 */
  refresh: () => void;
}

const DEFAULT_PARAMS: SectorQueryParams = {
  source: "industry",
  period: 60,
  strengthPeriod: 5,
};

export function useSectorAnalysis(): UseSectorAnalysisReturn {
  const [params, setParamsState] = useState<SectorQueryParams>(DEFAULT_PARAMS);
  const [quadrantData, setQuadrantData] = useState<SectorQuadrantResponse | null>(null);
  const [stockQuadrant, setStockQuadrant] = useState<StockQuadrantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("recentChange");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const setParams = useCallback((p: Partial<SectorQueryParams>) => {
    setParamsState((prev) => ({ ...prev, ...p }));
  }, []);

  const setSort = useCallback((field: SortField, dir: SortDir) => {
    setSortField(field);
    setSortDir(dir);
  }, []);

  // 获取板块象限数据
  const loadQuadrant = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSectorQuadrant(params);
      setQuadrantData(data);
    } catch (err) {
      console.error("获取板块象限数据失败:", err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { void loadQuadrant(); }, [loadQuadrant]);

  // 板块下钻：获取个股象限
  useEffect(() => {
    if (!selectedSector) {
      setStockQuadrant(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setStockLoading(true);
      try {
        const data = await fetchStockQuadrant({ ...params, sector: selectedSector });
        if (!cancelled) setStockQuadrant(data);
      } catch (err) {
        console.error("获取个股象限数据失败:", err);
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedSector, params]);

  // 拍平 + 过滤 + 排序
  const flatSectors = useMemo<FlatSectorItem[]>(() => {
    if (!quadrantData) return [];
    return flattenQuadrants(quadrantData.quadrants);
  }, [quadrantData]);

  const displaySectors = useMemo<FlatSectorItem[]>(() => {
    const filtered = filterSectors(flatSectors, keyword);
    return sortSectors(filtered, sortField, sortDir);
  }, [flatSectors, keyword, sortField, sortDir]);

  const refresh = useCallback(() => {
    void loadQuadrant();
  }, [loadQuadrant]);

  return {
    quadrantData,
    flatSectors,
    displaySectors,
    stockQuadrant,
    loading,
    stockLoading,
    params,
    setParams,
    keyword,
    setKeyword,
    selectedSector,
    setSelectedSector,
    sortField,
    sortDir,
    setSort,
    refresh,
  };
}
