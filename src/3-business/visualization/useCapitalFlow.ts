/**
 * useCapitalFlow — 资金流向数据 Hook (v2 东财push2delay真实数据)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { getBridgeUrl } from "@infra/config";
import type { SectorFlowItem } from "@ui/components/charts/ECharts/configs/fundflow.config";

interface FundOverview {
  mainNetInflow: number;
  superLargeInflow: number;
  largeInflow: number;
  mediumInflow: number;
  smallInflow: number;
  totalAmount: number;
  date: string;
  source: string;
}

interface SankeyNodeItem {
  name: string;
  itemStyle: { color: string };
}

interface SankeyLinkItem {
  source: string;
  target: string;
  value: number;
}

type SortField = "changePercent" | "stockCnt" | "mainInflow";

interface UseCapitalFlowResult {
  overview: FundOverview | null;
  sectors: SectorFlowItem[];
  stockFlows: SectorFlowItem[];
  conceptFlows: SectorFlowItem[];
  sankeyNodes: SankeyNodeItem[];
  sankeyLinks: SankeyLinkItem[];
  loading: boolean;
  error: string | null;
  sortField: SortField;
  setSortField: (f: SortField) => void;
  refresh: () => void;
}

function bridgeFetch(path: string): Promise<unknown> {
  const base = getBridgeUrl();
  const headers: Record<string, string> = {};
  if (base.includes("ngrok")) {
    headers["ngrok-skip-browser-warning"] = "1";
  }
  return fetch(base + path, { signal: AbortSignal.timeout(10000), headers })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

const CAT_COLORS: Record<string, string> = {
  "航天军工": "#ef4444", "军工": "#ef4444",
  "科技": "#3b82f6", "芯片": "#3b82f6", "AI": "#3b82f6",
  "医药": "#22c55e",
  "智造": "#8b5cf6", "机器人": "#8b5cf6",
  "周期": "#f59e0b", "化工": "#f59e0b",
  "新能源": "#06b6d4", "光伏": "#06b6d4",
  "金融": "#ec4899",
  "央企国企": "#f97316",
  "汽车": "#a855f7", "消费": "#14b8a6",
};

const KEYWORDS: Record<string, string> = {
  "航天": "航天军工", "军工": "航天军工", "卫星": "航天军工", "无人机": "航天军工", "低空": "航天军工",
  "芯片": "科技", "AI": "科技", "算力": "科技", "DeepSeek": "科技", "半导体": "科技",
  "医药": "医药", "医疗": "医药", "药": "医药",
  "机器人": "智造", "制造": "智造",
  "化工": "周期", "有色": "周期",
  "光伏": "新能源", "锂电": "新能源", "储能": "新能源",
  "国企": "央企国企", "央企": "央企国企",
  "消费": "消费", "汽车": "汽车",
  "券商": "金融", "金融": "金融",
};

export default function useCapitalFlow(): UseCapitalFlowResult {
  const [overview, setOverview] = useState<FundOverview | null>(null);
  const [sectors, setSectors] = useState<SectorFlowItem[]>([]);
  const [stockFlows, setStockFlows] = useState<SectorFlowItem[]>([]);
  const [conceptFlows, setConceptFlows] = useState<SectorFlowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("changePercent");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundResp, sectorResp, stockResp, conceptResp] = await Promise.all([
        bridgeFetch("/fund/flow"),
        bridgeFetch("/fund/sector"),
        bridgeFetch("/fund/stock?top=30"),
        bridgeFetch("/fund/concept"),
      ]);

      if (fundResp && (fundResp as Record<string,unknown>).source !== "unavailable") {
        const f = fundResp as Record<string,unknown>;
        setOverview({
          mainNetInflow: (f.mainNetInflow as number) ?? 0,
          superLargeInflow: (f.superLargeNetInflow as number) ?? 0,
          largeInflow: (f.largeNetInflow as number) ?? 0,
          mediumInflow: (f.mediumNetInflow as number) ?? 0,
          smallInflow: (f.smallNetInflow as number) ?? 0,
          totalAmount: (f.totalAmount as number) ?? 0,
          date: (f.date as string) ?? "",
          source: (f.source as string) ?? "unknown",
        });
      }

      if (sectorResp) {
        const items = ((sectorResp as Record<string,unknown>).data as Array<Record<string,unknown>>) || [];
        setSectors(items.map((s) => ({
          name: s.name as string,
          changePercent: (s.changePercent as number) ?? 0,
          stockCnt: (s.stockCnt as number) ?? 0,
          mainInflow: (s.mainNetInflow as number) ?? 0,
        })));
      }

      if (stockResp) {
        const items = ((stockResp as Record<string,unknown>).data as Array<Record<string,unknown>>) || [];
        setStockFlows(items.map((s) => ({
          name: (s.name as string) || (s.code as string) || "",
          changePercent: (s.changePercent as number) ?? 0,
          stockCnt: 1,
          mainInflow: (s.mainNetInflow as number) ?? 0,
        })));
      }

      if (conceptResp) {
        const items = ((conceptResp as Record<string,unknown>).data as Array<Record<string,unknown>>) || [];
        setConceptFlows(items.map((c) => ({
          name: (c.name as string) ?? "",
          changePercent: (c.changePercent as number) ?? 0,
          stockCnt: 0,
          mainInflow: (c.mainNetInflow as number) ?? 0,
        })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "数据加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedSectors = useMemo(() => {
    return [...sectors].sort((a, b) => {
      if (sortField === "changePercent") return b.changePercent - a.changePercent;
      if (sortField === "stockCnt") return b.stockCnt - a.stockCnt;
      return (b.mainInflow ?? 0) - (a.mainInflow ?? 0);
    });
  }, [sectors, sortField]);

  const { sankeyNodes, sankeyLinks } = useMemo(() => {
    const items = conceptFlows.length > 0 ? conceptFlows : sectors;
    if (items.length === 0) return { sankeyNodes: [], sankeyLinks: [] };

    const top = items.slice(0, 10);
    const nodes: SankeyNodeItem[] = [];
    const links: SankeyLinkItem[] = [];
    const nameSet = new Set<string>();
    const addNode = (name: string, color: string) => {
      if (!nameSet.has(name)) { nameSet.add(name); nodes.push({ name, itemStyle: { color } }); }
    };

    const catMap: Record<string, { inflow: number; color: string; subs: typeof top }> = {};
    for (const item of top) {
      let cat = "其他";
      for (const [kw, cn] of Object.entries(KEYWORDS)) {
        if (item.name.includes(kw)) { cat = cn; break; }
      }
      const color = CAT_COLORS[cat] ?? "#6b7280";
      if (!catMap[cat]) catMap[cat] = { inflow: 0, color, subs: [] };
      catMap[cat].inflow += Math.abs(item.mainInflow ?? 0);
      catMap[cat].subs.push(item);
    }

    addNode("全市场", "#f6b26b");
    for (const item of top) {
      const cat = Object.entries(KEYWORDS).find(([kw]) => item.name.includes(kw))?.[1] ?? "其他";
      addNode(item.name, CAT_COLORS[cat] ?? "#6b7280");
      links.push({ source: "全市场", target: item.name, value: Math.max(Math.abs(item.mainInflow ?? 0), 100000) });
    }

    for (const [cat, info] of Object.entries(catMap)) {
      addNode(cat, info.color);
      for (const sub of info.subs) {
        links.push({ source: sub.name, target: cat, value: Math.max(Math.abs(sub.mainInflow ?? 0) / 2, 50000) });
      }
    }

    return { sankeyNodes: nodes, sankeyLinks: links };
  }, [conceptFlows, sectors]);

  return {
    overview, sectors: sortedSectors, stockFlows, conceptFlows,
    sankeyNodes, sankeyLinks,
    loading, error,
    sortField, setSortField,
    refresh: fetchData,
  };
}
