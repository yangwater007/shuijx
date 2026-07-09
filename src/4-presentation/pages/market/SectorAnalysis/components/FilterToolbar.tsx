/**
 * FilterToolbar — 板块轮动筛选工具栏（对齐原站简洁风格）
 */

import { type FC } from "react";
import type { SectorQueryParams } from "@data/dto/sector";

interface Props {
  params: SectorQueryParams;
  onChange: (p: Partial<SectorQueryParams>) => void;
  onRefresh: () => void;
  loading: boolean;
  sourceLabel?: string;
  volumeAdjusted?: boolean;
  onVolumeAdjustedChange?: (v: boolean) => void;
  updateDate?: string;
}

const SOURCES = [
  { value: "industry", label: "行业" },
  { value: "concept", label: "概念" },
  { value: "region", label: "地区" },
];

const PERIODS = [
  { value: 60, label: "60日" },
  { value: 30, label: "30日" },
  { value: 20, label: "20日" },
  { value: 10, label: "10日" },
  { value: 5, label: "5日" },
];

const STRENGTHS = [
  { value: 5, label: "5日强度" },
  { value: 10, label: "10日强度" },
];

const btnBase = "rounded-md px-3 py-1.5 text-xs font-medium transition-colors";
const sep = <div className="h-5 w-px" style={{ backgroundColor: "var(--board-border)" }} />;

const FilterToolbar: FC<Props> = ({
  params, onChange, onRefresh, loading,
  volumeAdjusted = false, onVolumeAdjustedChange,
}) => (
  <div className="flex flex-wrap items-center gap-2 md:gap-3 rounded-xl px-4 py-2.5 border"
    style={{ backgroundColor: "var(--board-card)", borderColor: "var(--board-border)" }}>
    {/* 数据源 */}
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-slate-500 mr-1">数据源</span>
      {SOURCES.map((s) => (
        <button key={s.value} type="button" onClick={() => onChange({ source: s.value })}
          className={btnBase}
          style={{
            backgroundColor: params.source === s.value ? "var(--stock-up)" : "transparent",
            color: params.source === s.value ? "#fff" : "#94a3b8",
          }}>{s.label}</button>
      ))}
    </div>

    {sep}

    {/* 长周期 */}
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-slate-500 mr-1">周期</span>
      {PERIODS.map((p) => (
        <button key={p.value} type="button" onClick={() => onChange({ period: p.value })}
          className={btnBase}
          style={{
            backgroundColor: params.period === p.value ? "#3b82f6" : "transparent",
            color: params.period === p.value ? "#fff" : "#94a3b8",
          }}>{p.label}</button>
      ))}
    </div>

    {sep}

    {/* 短周期 */}
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-slate-500 mr-1">强度</span>
      {STRENGTHS.map((p) => (
        <button key={p.value} type="button" onClick={() => onChange({ strengthPeriod: p.value })}
          className={btnBase}
          style={{
            backgroundColor: params.strengthPeriod === p.value ? "#8b5cf6" : "transparent",
            color: params.strengthPeriod === p.value ? "#fff" : "#94a3b8",
          }}>{p.label}</button>
      ))}
    </div>

    {/* 成交量调整 */}
    {onVolumeAdjustedChange && (
      <>
        {sep}
        <button type="button" onClick={() => onVolumeAdjustedChange(!volumeAdjusted)}
          className={btnBase}
          style={{
            backgroundColor: volumeAdjusted ? "#22c55e" : "transparent",
            color: volumeAdjusted ? "#fff" : "#94a3b8",
          }}>
          {volumeAdjusted ? "量已调整" : "量未调整"}
        </button>
      </>
    )}

    <div className="flex-1" />

    <button type="button" onClick={onRefresh} disabled={loading}
      className="rounded-md px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
      {loading ? "⏳" : "🔄"} 刷新
    </button>
  </div>
);

export default FilterToolbar;
