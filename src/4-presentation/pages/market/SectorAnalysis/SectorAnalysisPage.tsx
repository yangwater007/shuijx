/**
 * SectorAnalysisPage — 板块轮动（对齐 quicktiny 原站四象限布局）
 * 顶栏筛选 → 象限散点图 → 四象限分组表格 → 右侧个股下钻
 */

import { useState, useMemo, type FC } from "react";
import { useSectorAnalysis } from "@business/sector/useSectorAnalysis";
import FilterToolbar from "./components/FilterToolbar";
import QuadrantChart from "./components/QuadrantChart";
import SectorTable from "./components/SectorTable";
import StockQuadrant from "./components/StockQuadrant";
import type { FlatSectorItem } from "@data/repository/sector";

// ─── 象限分组配置（对齐原站） ───

interface QuadrantConfig {
  key: FlatSectorItem["quadrant"];
  label: string;
  desc: string;
  barColor: string;
  bgColor: string;
  borderColor: string;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    key: "highStrong",
    label: "强势延续",
    desc: "60日↑ + 近5日↑ → 持续走强",
    barColor: "#ef4444",
    bgColor: "rgba(239,68,68,0.06)",
    borderColor: "rgba(239,68,68,0.2)",
  },
  {
    key: "highWeak",
    label: "高位回调",
    desc: "60日↑ + 近5日↓ → 短期调整",
    barColor: "#3b82f6",
    bgColor: "rgba(59,130,246,0.06)",
    borderColor: "rgba(59,130,246,0.2)",
  },
  {
    key: "lowStrong",
    label: "底部反转",
    desc: "60日↓ + 近5日↑ → 触底反弹",
    barColor: "#f97316",
    bgColor: "rgba(249,115,22,0.06)",
    borderColor: "rgba(249,115,22,0.2)",
  },
  {
    key: "lowWeak",
    label: "持续走弱",
    desc: "60日↓ + 近5日↓ → 弱势下行",
    barColor: "#6b7280",
    bgColor: "rgba(107,114,128,0.06)",
    borderColor: "rgba(107,114,128,0.2)",
  },
];

// ─── 工具 ───

function fmtDate(d: string | undefined): string {
  if (!d || d.length < 8) return "";
  return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
}

function groupByQuadrant(sectors: FlatSectorItem[]): Record<FlatSectorItem["quadrant"], FlatSectorItem[]> {
  const g: Record<FlatSectorItem["quadrant"], FlatSectorItem[]> = {
    highStrong: [], highWeak: [], lowStrong: [], lowWeak: [],
  };
  for (const s of sectors) g[s.quadrant].push(s);
  return g;
}

const SectorAnalysisPage: FC = () => {
  const hook = useSectorAnalysis();
  const [showChart, setShowChart] = useState(true);

  const periodLabel = "近" + hook.params.period + "日";
  const strengthLabel = hook.params.strengthPeriod + "日强度";
  const sourceLabel = hook.quadrantData?.meta?.sourceLabel;
  const dataDate = hook.quadrantData?.meta?.date;

  const groups = useMemo(() => groupByQuadrant(hook.displaySectors), [hook.displaySectors]);

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ 顶栏：标题 + 筛选 ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">板块轮动</h1>
          {sourceLabel && (
            <span className="rounded-full px-2.5 py-0.5 text-xs"
              style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#94a3b8" }}>
              {sourceLabel}
            </span>
          )}
          {dataDate && (
            <span className="text-xs text-slate-600">{fmtDate(dataDate)}</span>
          )}
        </div>
        <button onClick={() => setShowChart(v => !v)}
          className="rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
          {showChart ? "收起图表 ▲" : "展开图表 ▼"}
        </button>
      </div>

      {/* ═══ 筛选工具栏 ═══ */}
      <FilterToolbar
        params={hook.params}
        onChange={hook.setParams}
        onRefresh={hook.refresh}
        loading={hook.loading}
        sourceLabel={sourceLabel}
        updateDate={dataDate}
        volumeAdjusted={hook.volumeAdjusted}
        onVolumeAdjustedChange={hook.setVolumeAdjusted}
      />

      {/* ═══ 象限散点图 ═══ */}
      {showChart && hook.quadrantData && (
        <div className="overflow-hidden rounded-xl border" style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: "var(--board-border)" }}>
            <h2 className="text-sm font-bold text-slate-300">
              象限分析 · {hook.flatSectors.length}个板块
            </h2>
          </div>
          <QuadrantChart
            quadrants={hook.quadrantData.quadrants}
            periodLabel={periodLabel}
            strengthLabel={strengthLabel}
            height={400}
            loading={hook.loading}
          />
        </div>
      )}

      {/* ═══ 四象限分组 ═══ */}
      <div className="space-y-5">
        {QUADRANTS.map((cfg) => {
          const sectors = groups[cfg.key];
          return (
            <div key={cfg.key} className="overflow-hidden rounded-xl border"
              style={{ backgroundColor: "var(--board-card)", borderColor: cfg.borderColor }}>
              {/* 区块标题 */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderLeft: "4px solid " + cfg.barColor, backgroundColor: cfg.bgColor }}>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-white">{cfg.label}</h3>
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: cfg.barColor + "18", color: cfg.barColor }}>
                    {sectors.length}个板块
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-500">{cfg.desc}</span>
                </div>
              </div>

              {/* 区块表格 */}
              {sectors.length > 0 ? (
                <SectorTable
                  sectors={sectors}
                  selectedSector={hook.selectedSector}
                  onSelect={hook.setSelectedSector}
                  sortField={hook.sortField}
                  sortDir={hook.sortDir}
                  onSort={hook.setSort}
                  loading={hook.loading}
                  hideQuadrantCol
                  accentColor={cfg.barColor}
                />
              ) : (
                <div className="py-14 text-center text-sm text-slate-600">暂无该象限板块</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ 右侧个股面板（点击板块后浮出） ═══ */}
      {hook.selectedSector && (
        <div className="fixed right-0 top-0 z-40 h-full w-[380px] max-w-[92vw] shadow-2xl border-l"
          style={{ backgroundColor: "var(--board-bg)", borderColor: "var(--board-border)" }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--board-border)" }}>
            <h2 className="text-sm font-bold text-white">
              {hook.selectedSector}
              {hook.stockQuadrant?.meta?.stockCount && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {hook.stockQuadrant.meta.stockCount}只个股
                </span>
              )}
            </h2>
            <button onClick={() => hook.setSelectedSector(null)}
              className="rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-300">✕ 关闭</button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-57px)]">
            <StockQuadrant data={hook.stockQuadrant} loading={hook.stockLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SectorAnalysisPage;
