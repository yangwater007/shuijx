/**
 * useDragonTiger — 龙虎榜数据 Hook
 * 合并 东财个股资金流 + 涨停池数据
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { getBridgeUrl } from "@infra/config";

export interface DragonTigerStock {
  code: string;
  name: string;
  changePercent: number;
  price: number;
  mainNetInflow: number;
  superLargeInflow: number;
  largeInflow: number;
  mediumInflow: number;
  smallInflow: number;
  amount: number;
  reasonType: string;
  reasonInfo: string;
  continueNum: number;
  limitType: string;
  flowType: "inflow" | "outflow" | "flat";
}

interface UseDragonTigerResult {
  stocks: DragonTigerStock[];
  totalInflowCount: number;
  totalOutflowCount: number;
  totalNetInflow: number;
  totalNetOutflow: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function bridgeFetch(path: string): Promise<unknown> {
  const base = getBridgeUrl();
  const headers: Record<string, string> = {};
  if (base.includes("ngrok")) headers["ngrok-skip-browser-warning"] = "1";
  return fetch(base + path, { signal: AbortSignal.timeout(10000), headers })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

export default function useDragonTiger(): UseDragonTigerResult {
  const [stocks, setStocks] = useState<DragonTigerStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundResp, limitResp] = await Promise.all([
        bridgeFetch("/fund/stock?top=200"),
        bridgeFetch("/limit/up"),
      ]);

      // 涨停池索引（按code）
      const limitMap = new Map<string, Record<string, unknown>>();
      if (limitResp) {
        const items = ((limitResp as Record<string, unknown>).data as Array<Record<string, unknown>>) || [];
        for (const item of items) {
          limitMap.set(item.code as string, item);
        }
      }

      // 资金流数据
      const fundItems = ((fundResp as Record<string, unknown>)?.data as Array<Record<string, unknown>>) || [];
      const merged: DragonTigerStock[] = fundItems.map((f) => {
        const code = f.code as string;
        const limitInfo = limitMap.get(code);
        const mainInflow = (f.mainNetInflow as number) ?? 0;
        return {
          code,
          name: (f.name as string) || code,
          changePercent: (f.changePercent as number) ?? 0,
          price: (f.price as number) ?? 0,
          mainNetInflow: mainInflow,
          superLargeInflow: (f.superLargeInflow as number) ?? 0,
          largeInflow: (f.largeInflow as number) ?? 0,
          mediumInflow: (f.mediumInflow as number) ?? 0,
          smallInflow: (f.smallInflow as number) ?? 0,
          amount: (limitInfo?.amount as number) ?? 0,
          reasonType: (limitInfo?.reasonType as string) || (f.maxInflow as string) || "",
          reasonInfo: "",
          continueNum: (limitInfo?.continueNum as number) ?? 0,
          limitType: (limitInfo?.limitType as string) || "",
          flowType: mainInflow > 0 ? "inflow" : mainInflow < 0 ? "outflow" : "flat",
        };
      });

      // 只显示有涨停记录的股票优先，然后按净流入排序
      merged.sort((a, b) => {
        if (a.continueNum > 0 && b.continueNum === 0) return -1;
        if (b.continueNum > 0 && a.continueNum === 0) return 1;
        return Math.abs(b.mainNetInflow) - Math.abs(a.mainNetInflow);
      });

      setStocks(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "数据加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const inflow = stocks.filter((s) => s.flowType === "inflow");
    const outflow = stocks.filter((s) => s.flowType === "outflow");
    return {
      totalInflowCount: inflow.length,
      totalOutflowCount: outflow.length,
      totalNetInflow: inflow.reduce((sum, s) => sum + s.mainNetInflow, 0),
      totalNetOutflow: Math.abs(outflow.reduce((sum, s) => sum + s.mainNetInflow, 0)),
    };
  }, [stocks]);

  return { stocks, ...stats, loading, error, refresh: fetchData };
}
