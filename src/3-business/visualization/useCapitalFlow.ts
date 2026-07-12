/**
 * useCapitalFlow — 资金流向数据 Hook (v2 — 东财push2delay真实数据)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { LOCAL_BRIDGE_URL } from "@infra/config";
import type { SectorFlowItem } from "@ui/components/charts/ECharts/configs/fundflow.config";

/** 大盘资金概览 */
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

/** 桑基图节点 */
interface SankeyNodeItem {
  name: string;
  itemStyle: { color: string };
}

/** 桑基图边 */
interface SankeyLinkItem {
  source: string;
  target: string;
  value: number;
}

/** 排序字段 */
type SortField = "changePercent" | "stockCnt" | "mainInflow";

interface UseCapitalFlowResult {
  overview: FundOverview | null;
  sectors: SectorFlowItem[];
  stockFlows: SectorFlowItem[];      // 个股资金流
  conceptFlows: SectorFlowItem[];    // 概念板块资金流
  sankeyNodes: SankeyNodeItem[];
  sankeyLinks: SankeyLinkItem[];
  loading: boolean;
  error: string | null;
  sortField: SortField;
  setSortField: (f: SortField) => void;
  refresh: () => void;
}

const BRIDGE = LOCAL_BRIDGE_URL;

/** 大类配色 */
const CAT_COLORS: Record<string, string> = {
  "航天军工": "#ef4444", "军工": "#ef4444",
  "央企国企": "#f97316", "国企改革": "#f97316",
  "科技": "#3b82f6", "芯片": "#3b82f6", "AI": "#3b82f6",
  "医药": "#22c55e", "医药消费": "#22c55e",
  "智造": "#8b5cf6", "机器人": "#8b5cf6",
  "周期": "#f59e0b", "化工": "#f59e0b", "有色": "#f59e0b",
  "新能源": "#06b6d4", "光伏": "#06b6d4",
  "金融地产": "#ec4899", "券商": "#ec4899",
  "消费": "#14b8a6", "基建": "#6366f1",
  "汽车": "#a855f7", "通信": "#e11d48",
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
        fetch(BRIDGE + "/fund/flow", { signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(BRIDGE + "/fund/sector", { signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(BRIDGE + "/fund/stock?top=30", { signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(BRIDGE + "/fund/concept", { signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (fundResp && fundResp.source !== "unavailable") {
        setOverview({
          mainNetInflow: fundResp.mainNetInflow ?? 0,
          superLargeInflow: fundResp.superLargeNetInflow ?? 0,
          largeInflow: fundResp.largeNetInflow ?? 0,
          mediumInflow: fundResp.mediumNetInflow ?? 0,
          smallInflow: fundResp.smallNetInflow ?? 0,
          totalAmount: fundResp.totalAmount ?? 0,
          date: fundResp.date ?? "",
          source: fundResp.source ?? "unknown",
        });
      } else if (fundResp) {
        setOverview({
          mainNetInflow: 0, superLargeInflow: 0, largeInflow: 0,
          mediumInflow: 0, smallInflow: 0, totalAmount: fundResp.totalAmount ?? 0,
          date: fundResp.date ?? "", source: "database",
        });
      }

      if (sectorResp?.data) {
        setSectors(sectorResp.data.map((s: Record<string, unknown>) => ({
          name: s.name as string,
          changePercent: s.changePercent as number ?? 0,
          stockCnt: s.stockCnt as number ?? 0,
          mainInflow: (s.mainNetInflow as number) ?? 0,
        })));
      }

      if (stockResp?.data) {
        setStockFlows(stockResp.data.map((s: Record<string, unknown>) => ({
          name: (s.name as string) || (s.code as string) || "",
          changePercent: s.changePercent as number ?? 0,
          stockCnt: 1,
          mainInflow: (s.mainNetInflow as number) ?? 0,
        })));
      }

      if (conceptResp?.data) {
        setConceptFlows(conceptResp.data.map((c: Record<string, unknown>) => ({
          name: c.name as string ?? "",
          changePercent: c.changePercent as number ?? 0,
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

  /** 构建桑基图：概念板块资金流 Top 8 → 大类 */
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

    // 归类
    const catMap: Record<string, { inflow: number; color: string; subs: typeof top }> = {};
    const KEYWORDS: Record<string, string> = {
      "航天": "航天军工", "军工": "航天军工", "卫星": "航天军工", "无人机": "航天军工", "低空": "航天军工",
      "芯片": "科技", "AI": "科技", "算力": "科技", "DeepSeek": "科技", "半导体": "科技",
      "医药": "医药", "医疗": "医药", "药": "医药",
      "机器人": "智造", "制造": "智造",
      "化工": "周期", "有色": "周期", "钢铁": "周期", "煤炭": "周期",
      "光伏": "新能源", "锂电": "新能源", "储能": "新能源", "新能源": "新能源",
      "国企": "央企国企", "央企": "央企国企",
      "消费": "消费", "汽车": "汽车",
      "券商": "金融", "金融": "金融", "银行": "金融",
    };

    for (const item of top) {
      let cat = "其他";
      let color = "#6b7280";
      for (const [kw, cn] of Object.entries(KEYWORDS)) {
        if (item.name.includes(kw)) { cat = cn; break; }
      }
      color = CAT_COLORS[cat] ?? "#6b7280";
      if (!catMap[cat]) catMap[cat] = { inflow: 0, color, subs: [] };
      catMap[cat].inflow += Math.abs(item.mainInflow ?? 0);
      catMap[cat].subs.push(item);
    }

    // 全市场资金 源节点
    addNode("全市场", "#f6b26b");
    for (const item of top) {
      addNode(item.name, CAT_COLORS[Object.entries(KEYWORDS).find(([kw]) => item.name.includes(kw))?.[1] ?? "其他"] ?? "#6b7280");
      const val = Math.max(Math.abs(item.mainInflow ?? 0), 100000);
      links.push({ source: "全市场", target: item.name, value: val });
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
