/**
 * CapitalFlowView — 资金流向可视化视图 (v2 东财真实数据)
 */

import { useMemo, type FC } from "react";
import BaseChart from "@ui/components/charts/ECharts/BaseChart";
import { getSankeyOption, getSectorBarOption } from "@ui/components/charts/ECharts/configs/fundflow.config";
import useCapitalFlow from "@business/visualization/useCapitalFlow";
import { STOCK_UP, STOCK_DOWN, STOCK_FLAT } from "@infra/config";

/** 格式化金额（亿/万自适应） */
function fmtAmount(val: number): string {
  const yi = val / 1e8;
  if (Math.abs(yi) >= 1) return `${yi > 0 ? "+" : ""}${yi.toFixed(2)}亿`;
  const wan = val / 1e4;
  return `${wan > 0 ? "+" : ""}${wan.toFixed(0)}万`;
}

/** 概览卡片 */
const OverviewCard: FC<{ label: string; value: number; isAmount?: boolean }> = ({ label, value, isAmount }) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const color = isPositive ? STOCK_UP : isNegative ? STOCK_DOWN : STOCK_FLAT;
  return (
    <div className="flex flex-col items-center rounded-lg p-3 min-w-[100px]"
      style={{ backgroundColor: "var(--board-card)" }}>
      <span className="text-[11px] text-slate-400 mb-1 whitespace-nowrap">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>
        {isAmount ? fmtAmount(value) : value.toFixed(2)}
      </span>
    </div>
  );
};

type SortField = "changePercent" | "stockCnt" | "mainInflow";

const SORT_LABELS: Record<SortField, string> = {
  changePercent: "涨幅",
  stockCnt: "成分股数",
  mainInflow: "资金净流入",
};

const CapitalFlowView: FC = () => {
  const { overview, sectors, stockFlows, sankeyNodes, sankeyLinks, loading, error, sortField, setSortField, refresh } = useCapitalFlow();

  const sankeyOption = useMemo(() => getSankeyOption(sankeyNodes, sankeyLinks), [sankeyNodes, sankeyLinks]);
  const sectorBarOption = useMemo(() => getSectorBarOption(sectors, 15), [sectors]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
        <span className="text-4xl">⚠️</span>
        <p>{error}</p>
        <button type="button" onClick={refresh}
          className="rounded-lg px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 transition-colors">
          重新加载
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── 1. 大盘资金概览 ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>💰</span> 大盘资金概览
            {overview?.date && (
              <span className="text-[11px] font-normal text-slate-500 ml-2">
                {overview.date} · {overview.source === "database" ? "DB" : "东财实时"}
              </span>
            )}
          </h3>
          <button type="button" onClick={refresh}
            className="text-[11px] text-slate-500 hover:text-white transition-colors px-3 py-1 rounded border border-slate-700 hover:border-slate-500"
            disabled={loading}>
            {loading ? "刷新中..." : "🔄 刷新"}
          </button>
        </div>
        {loading && !overview ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <div className="animate-spin w-5 h-5 border-2 border-slate-600 border-t-red-500 rounded-full mr-2" />
            加载中...
          </div>
        ) : overview ? (
          <div className="flex flex-wrap gap-3">
            <OverviewCard label="成交额" value={overview.totalAmount} isAmount />
            <OverviewCard label="主力净流入" value={overview.mainNetInflow} isAmount />
            <OverviewCard label="超大单净流入" value={overview.superLargeInflow} isAmount />
            <OverviewCard label="大单净流入" value={overview.largeInflow} isAmount />
            <OverviewCard label="中单净流入" value={overview.mediumInflow} isAmount />
            <OverviewCard label="小单净流入" value={overview.smallInflow} isAmount />
          </div>
        ) : null}
      </div>

      {/* ─── 2. 桑基图 + 板块排行（双列） ─── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
          <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
            <span>🔀</span> 概念板块资金流向
            <span className="text-[11px] font-normal text-slate-500">东财实时</span>
          </h3>
          {sankeyNodes.length > 0 ? (
            <BaseChart option={sankeyOption} height={400} />
          ) : (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
              {loading ? "加载中..." : "暂无数据"}
            </div>
          )}
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> 板块涨幅排行 Top 15
            </h3>
            <div className="flex gap-1 text-[10px]">
              {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([key, label]) => (
                <button key={key} type="button"
                  onClick={() => setSortField(key)}
                  className="rounded px-2 py-1 transition-colors"
                  style={{
                    backgroundColor: sortField === key ? "var(--board-bg)" : "transparent",
                    color: sortField === key ? "#f6b26b" : "#64748b",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {sectors.length > 0 ? (
            <BaseChart option={sectorBarOption} height={400} />
          ) : (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
              {loading ? "加载中..." : "暂无数据"}
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. 板块资金明细表 ─── */}
      {sectors.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
          <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
            <span>📋</span> 行业板块资金明细
            <span className="text-[11px] font-normal text-slate-500">{sectors.length}个行业</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b" style={{ borderColor: "var(--board-border)" }}>
                  <th className="text-left py-2 px-3 w-8">#</th>
                  <th className="text-left py-2 px-3">板块名称</th>
                  <th className="text-right py-2 px-3">今日涨幅</th>
                  <th className="text-right py-2 px-3">成分股数</th>
                  <th className="text-right py-2 px-3">主力净流入</th>
                </tr>
              </thead>
              <tbody>
                {sectors.slice(0, 40).map((s, i) => (
                  <tr key={s.name} className="border-b transition-colors hover:bg-white/5"
                    style={{ borderColor: "var(--board-border)" }}>
                    <td className="py-2.5 px-3 text-slate-600">{i + 1}</td>
                    <td className="py-2.5 px-3 text-white font-medium">{s.name}</td>
                    <td className="py-2.5 px-3 text-right font-bold"
                      style={{ color: s.changePercent >= 0 ? STOCK_UP : STOCK_DOWN }}>
                      {s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{s.stockCnt}只</td>
                    <td className="py-2.5 px-3 text-right font-medium"
                      style={{ color: (s.mainInflow ?? 0) >= 0 ? STOCK_UP : STOCK_DOWN }}>
                      {s.mainInflow ? fmtAmount(s.mainInflow) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 4. 个股资金流排行 ─── */}
      {stockFlows.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
          <h3 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
            <span>🏆</span> 个股资金流排行 Top 30
            <span className="text-[11px] font-normal text-slate-500">主力净流入</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b" style={{ borderColor: "var(--board-border)" }}>
                  <th className="text-left py-2 px-3 w-8">#</th>
                  <th className="text-left py-2 px-3">股票名称</th>
                  <th className="text-right py-2 px-3">涨跌幅</th>
                  <th className="text-right py-2 px-3">主力净流入</th>
                  <th className="text-right py-2 px-3">超大单</th>
                  <th className="text-right py-2 px-3">大单</th>
                  <th className="text-right py-2 px-3">中单</th>
                  <th className="text-right py-2 px-3">小单</th>
                </tr>
              </thead>
              <tbody>
                {stockFlows.slice(0, 30).map((s, i) => (
                  <tr key={s.name} className="border-b transition-colors hover:bg-white/5"
                    style={{ borderColor: "var(--board-border)" }}>
                    <td className="py-2.5 px-3 text-slate-600">{i + 1}</td>
                    <td className="py-2.5 px-3 text-white font-bold">{s.name}</td>
                    <td className="py-2.5 px-3 text-right font-bold"
                      style={{ color: s.changePercent >= 0 ? STOCK_UP : STOCK_DOWN }}>
                      {s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium"
                      style={{ color: (s.mainInflow ?? 0) >= 0 ? STOCK_UP : STOCK_DOWN }}>
                      {fmtAmount(s.mainInflow ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {fmtAmount((s as unknown as Record<string, unknown>).superLargeInflow as number ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {fmtAmount((s as unknown as Record<string, unknown>).largeInflow as number ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {fmtAmount((s as unknown as Record<string, unknown>).mediumInflow as number ?? 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {fmtAmount((s as unknown as Record<string, unknown>).smallInflow as number ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapitalFlowView;
