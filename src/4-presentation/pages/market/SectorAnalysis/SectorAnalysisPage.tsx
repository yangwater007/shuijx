/**
 * SectorAnalysisPage — 板块轮动分析页面
 * 左右双栏布局：左侧图表+表格，右侧个股下钻面板
 * 支持全局视图/分组视图切换
 */

import { useState, useMemo, type FC } from "react";
import { useSectorAnalysis } from "@business/sector/useSectorAnalysis";
import FilterToolbar from "./components/FilterToolbar";
import QuadrantChart from "./components/QuadrantChart";
import SectorTable from "./components/SectorTable";
import QuadrantGroup, { QUADRANT_GROUP_CONFIGS } from "./components/QuadrantGroup";
import StockQuadrant from "./components/StockQuadrant";
import type { FlatSectorItem } from "@data/repository/sector";

type ViewMode = "merged" | "grouped";

/** 格式化日期（YYYYMMDD → YYYY-MM-DD） */
function fmtDate(dateStr: string | undefined): string {
  if (!dateStr || dateStr.length < 8) return "—";
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/** 按象限 key 分组 sector 列表 */
function groupByQuadrant(
  sectors: FlatSectorItem[]
): Record<FlatSectorItem["quadrant"], FlatSectorItem[]> {
  const groups: Record<FlatSectorItem["quadrant"], FlatSectorItem[]> = {
    highStrong: [],
    highWeak: [],
    lowStrong: [],
    lowWeak: [],
  };
  for (const s of sectors) {
    groups[s.quadrant].push(s);
  }
  return groups;
}

const SectorAnalysisPage: FC = () => {
  const hook = useSectorAnalysis();
  const [showChart, setShowChart] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("merged");

  const periodLabel = `近${hook.params.period}日`;
  const strengthLabel = `${hook.params.strengthPeriod}日`;

  const sourceLabel =
    hook.params.source === "industry" ? "行业"
    : hook.params.source === "concept" ? "概念"
    : "地区";

  // 分组视图下按象限拆分
  const quadrantGroups = useMemo(
    () => groupByQuadrant(hook.displaySectors),
    [hook.displaySectors]
  );

  return (
    <div className="flex gap-4 items-start">
      {/* ============================================ */}
      {/* 左侧面板：标题 + 工具栏 + 图表 + 表格         */}
      {/* ============================================ */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* 页面标题行 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">板块轮动</h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs"
              style={{ backgroundColor: "var(--board-card)", color: "#94a3b8" }}
            >
              {sourceLabel}
            </span>
            {hook.quadrantData?.meta?.date && (
              <span className="text-xs text-slate-500">
                更新: {fmtDate(hook.quadrantData.meta.date)}
              </span>
            )}
          </div>

          {/* 右侧操作区：视图切换 + 图表折叠 */}
          <div className="flex items-center gap-2">
            {/* 视图切换按钮组 */}
            <div className="flex overflow-hidden rounded-lg" style={{ backgroundColor: "var(--board-card)" }}>
              {([
                { value: "merged" as ViewMode, label: "全局视图" },
                { value: "grouped" as ViewMode, label: "分组视图" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setViewMode(opt.value)}
                  className="px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: viewMode === opt.value ? "var(--stock-up)" : "transparent",
                    color: viewMode === opt.value ? "#fff" : "#94a3b8",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowChart((v) => !v)}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            >
              {showChart ? "收起图表 ▲" : "展开图表 ▼"}
            </button>
          </div>
        </div>

        {/* 筛选工具栏 */}
        <FilterToolbar
          params={hook.params}
          onChange={hook.setParams}
          onRefresh={hook.refresh}
          loading={hook.loading}
        />

        {/* 象限散点图（可折叠） */}
        {showChart && (
          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--board-border)" }}>
              <h2 className="text-sm font-bold text-slate-300">
                板块象限分布
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({hook.displaySectors.length}个板块 / {periodLabel}涨幅 vs {strengthLabel}强度)
                </span>
              </h2>
            </div>
            <div className="p-2">
              <QuadrantChart
                quadrants={hook.quadrantData?.quadrants ?? { highStrong: [], highWeak: [], lowStrong: [], lowWeak: [] }}
                periodLabel={periodLabel}
                strengthLabel={strengthLabel}
                loading={hook.loading}
              />
            </div>
            {/* 图例 */}
            <div className="flex flex-wrap items-center gap-6 border-t px-5 py-2.5" style={{ borderColor: "var(--board-border)" }}>
              {QUADRANT_GROUP_CONFIGS.map((cfg) => (
                <div key={cfg.key} className="flex items-center gap-1.5 text-xs">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.barColor }} />
                  <span className="font-medium text-slate-300">{cfg.label}</span>
                  <span className="hidden text-slate-600 sm:inline">{cfg.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== 全局视图：合并单表格 ====== */}
        {viewMode === "merged" && (
          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--board-border)" }}>
              <h2 className="text-sm font-bold text-slate-300">
                板块列表
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {hook.displaySectors.length}个板块
                </span>
              </h2>
              <input
                type="text"
                value={hook.keyword}
                onChange={(e) => hook.setKeyword(e.target.value)}
                placeholder="搜索板块…"
                className="rounded-lg border bg-transparent px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ borderColor: "var(--board-border)", width: 200 }}
              />
            </div>
            <SectorTable
              sectors={hook.displaySectors}
              selectedSector={hook.selectedSector}
              onSelect={hook.setSelectedSector}
              sortField={hook.sortField}
              sortDir={hook.sortDir}
              onSort={hook.setSort}
              loading={hook.loading}
            />
          </div>
        )}

        {/* ====== 分组视图：四象限分组 ====== */}
        {viewMode === "grouped" && (
          <div className="space-y-5">
            {/* 分组视图顶栏：标题 + 搜索 */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300">
                板块列表
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {hook.displaySectors.length}个板块
                </span>
              </h2>
              <input
                type="text"
                value={hook.keyword}
                onChange={(e) => hook.setKeyword(e.target.value)}
                placeholder="搜索板块…"
                className="rounded-lg border bg-transparent px-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ borderColor: "var(--board-border)", width: 200 }}
              />
            </div>

            {/* 四个象限分组区块 */}
            {QUADRANT_GROUP_CONFIGS.map((cfg) => (
              <QuadrantGroup
                key={cfg.key}
                config={cfg}
                sectors={quadrantGroups[cfg.key]}
                selectedSector={hook.selectedSector}
                onSelect={hook.setSelectedSector}
                loading={hook.loading}
              />
            ))}

            {/* 无数据提示 */}
            {hook.displaySectors.length === 0 && !hook.loading && (
              <div className="rounded-xl py-14 text-center" style={{ backgroundColor: "var(--board-card)" }}>
                <span className="text-sm text-slate-500">暂无匹配的板块数据 — 尝试调整筛选条件或清除搜索</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* 右侧面板：个股下钻 — 点击板块后展示          */}
      {/* ============================================ */}
      {hook.selectedSector && (
        <div className="w-[380px] shrink-0 space-y-4">
          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--board-border)" }}>
              <h2 className="text-sm font-bold text-slate-300">
                {hook.selectedSector} — 个股分布
                {hook.stockQuadrant && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {hook.stockQuadrant.meta.stockCount} 只
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => hook.setSelectedSector(null)}
                className="rounded px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
              >
                关闭 ✕
              </button>
            </div>
            <StockQuadrant data={hook.stockQuadrant} loading={hook.stockLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SectorAnalysisPage;
