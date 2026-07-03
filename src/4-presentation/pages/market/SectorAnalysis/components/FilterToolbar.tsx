/**
 * FilterToolbar — 板块轮动筛选工具栏
 * 数据源 / 周期 / 强度周期 选择器
 */

import { type FC } from "react";
import type { SectorQueryParams } from "@data/dto/sector";

interface Props {
  params: SectorQueryParams;
  onChange: (p: Partial<SectorQueryParams>) => void;
  onRefresh: () => void;
  loading: boolean;
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

const FilterToolbar: FC<Props> = ({ params, onChange, onRefresh, loading }) => {
  const btnBase = "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl px-5 py-3" style={{ backgroundColor: "var(--board-card)" }}>
      {/* 数据源 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">数据源</span>
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

      {/* 分隔 */}
      <div className="h-5 w-px" style={{ backgroundColor: "var(--board-border)" }} />

      {/* 长周期 */}
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

      {/* 分隔 */}
      <div className="h-5 w-px" style={{ backgroundColor: "var(--board-border)" }} />

      {/* 短周期强度 */}
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

      {/* 刷新 */}
      <div className="ml-auto">
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
