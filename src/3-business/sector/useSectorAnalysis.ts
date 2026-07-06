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
  quadrantData: SectorQuadrantResponse | null;
  flatSectors: FlatSectorItem[];
  displaySectors: FlatSectorItem[];
  stockQuadrant: StockQuadrantResponse | null;
  loading: boolean;
  stockLoading: boolean;
  params: SectorQueryParams;
  setParams: (p: Partial<SectorQueryParams>) => void;
  keyword: string;
  setKeyword: (k: string) => void;
  selectedSector: string | null;
  setSelectedSector: (s: string | null) => void;
  sortField: SortField;
  sortDir: SortDir;
  setSort: (field: SortField, dir: SortDir) => void;
  refresh: () => void;
  volumeAdjusted: boolean;
  setVolumeAdjusted: (v: boolean) => void;
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
  const [volumeAdjusted, setVolumeAdjusted] = useState(false);

  const setParams = useCallback((p: Partial<SectorQueryParams>) => {
    setParamsState((prev) => ({ ...prev, ...p }));
  }, []);

  const setSort = useCallback((field: SortField, dir: SortDir) => {
    setSortField(field);
    setSortDir(dir);
  }, []);

  const loadQuadrant = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSectorQuadrant(params);
      setQuadrantData(data);
    } catch (err) {
      console.error("板块象限数据加载失败:", err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { void loadQuadrant(); }, [loadQuadrant]);

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
        console.error("个股象限数据加载失败:", err);
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedSector, params]);

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
    volumeAdjusted,
    setVolumeAdjusted,
  };
}
