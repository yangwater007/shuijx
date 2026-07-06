/**
 * FilterToolbar — 板块轮动筛选工具栏
 * 数据源 / 周期 / 强度周期 / 成交量调整选择器
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

const STRENGTH_PERIODS = [
  { value: 5, label: "5日强度" },
  { value: 10, label: "10日强度" },
];

const FilterToolbar: FC<Props> = ({ params, onChange, onRefresh, loading, sourceLabel, updateDate, volumeAdjusted = false, onVolumeAdjustedChange }) => {
  const btnBase = "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-4 rounded-xl px-3 md:px-5 py-2 md:py-3" style={{ backgroundColor: "var(--board-card)" }}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">数据源</span>
        {sourceLabel && (
          <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>
            {sourceLabel}
          </span>
        )}
        {SOURCES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange({ source: s.value })}
            className={btnBase}
            style={{
              backgroundColor: params.source === s.value ? "var(--stock-up)" : "transparent",
              color: params.source === s.value ? "#fff" : "#94a3b8",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px" style={{ backgroundColor: "var(--board-border)" }} />

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">周期</span>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange({ period: p.value })}
            className={btnBase}
            style={{
              backgroundColor: params.period === p.value ? "#3b82f6" : "transparent",
              color: params.period === p.value ? "#fff" : "#94a3b8",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px" style={{ backgroundColor: "var(--board-border)" }} />

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">强度</span>
        {STRENGTH_PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange({ strengthPeriod: p.value })}
            className={btnBase}
            style={{
              backgroundColor: params.strengthPeriod === p.value ? "#8b5cf6" : "transparent",
              color: params.strengthPeriod === p.value ? "#fff" : "#94a3b8",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px" style={{ backgroundColor: "var(--board-border)" }} />

      {onVolumeAdjustedChange && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">成交量</span>
          <button
            type="button"
            onClick={() => onVolumeAdjustedChange(!volumeAdjusted)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: volumeAdjusted ? "#22c55e" : "transparent",
              color: volumeAdjusted ? "#fff" : "#94a3b8",
            }}
          >
            {volumeAdjusted ? "已调整" : "未调整"}
          </button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {updateDate && (
          <span className="text-xs text-slate-600">
            {updateDate.slice(0,4)}-{updateDate.slice(4,6)}-{updateDate.slice(6,8)}
          </span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
        >
          <span>{loading ? "⏳" : "🔄"}</span>
          <span>刷新</span>
        </button>
      </div>
    </div>
  );
};

export default FilterToolbar;
