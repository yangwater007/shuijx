/**
 * SectorTable — 板块数据列表（对齐 quicktiny 原站列布局）
 * 列: 板块+成分股数 | 近N日涨幅 | 今日涨幅 | 60日涨幅 | 量比 | 成分股
 */

import { type FC } from "react";
import type { FlatSectorItem } from "@data/repository/sector";
import type { SortField, SortDir } from "@service/sector/SectorService";

interface Props {
  sectors: FlatSectorItem[];
  selectedSector: string | null;
  onSelect: (name: string | null) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField, dir: SortDir) => void;
  loading: boolean;
  hideQuadrantCol?: boolean;
  accentColor?: string;
}

function changeColor(v: number): string {
  if (v > 0) return "var(--stock-up)";
  if (v < 0) return "var(--stock-down)";
  return "var(--stock-flat)";
}

function formatPct(v: number): string {
  return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
}

function sortIcon(field: SortField, current: SortField, dir: SortDir): string {
  if (field !== current) return "";
  return dir === "asc" ? " ▲" : " ▼";
}

const COLUMNS: { key: SortField; label: string; width: string; align: "left" | "right" }[] = [
  { key: "name", label: "板块", width: "auto", align: "left" },
  { key: "recentChange", label: "近N日涨幅", width: "100px", align: "right" },
  { key: "todayChange", label: "今日涨跌", width: "90px", align: "right" },
  { key: "periodChange", label: "60日涨幅", width: "90px", align: "right" },
  { key: "volumeRatio", label: "量比", width: "70px", align: "right" },
  { key: "stockCount", label: "成分股", width: "70px", align: "right" },
];

const SectorTable: FC<Props> = ({
  sectors, selectedSector, onSelect, sortField, sortDir, onSort, loading,
  accentColor,
}) => {
  const handleSort = (field: SortField) => {
    onSort(field, field === sortField ? (sortDir === "asc" ? "desc" : "asc") : "desc");
  };

  if (loading && sectors.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-red-400 mr-2" />
        <span className="text-sm text-slate-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--board-border)", backgroundColor: "rgba(0,0,0,0.12)" }}>
            {COLUMNS.map((col) => {
              const active = col.key === sortField;
              return (
                <th key={col.key} className="whitespace-nowrap px-4 py-2.5 text-[11px] font-medium"
                  style={{ textAlign: col.align, width: col.width, color: active ? (accentColor ?? "#94a3b8") : "#64748b" }}>
                  <button type="button" onClick={() => handleSort(col.key)}
                    className="transition-colors hover:text-slate-300">
                    {col.label}
                    <span className="ml-0.5 text-[9px]">{sortIcon(col.key, sortField, sortDir) || " ⇅"}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sectors.map((item) => {
            const isSel = selectedSector === item.name;
            return (
              <tr key={item.name}
                onClick={() => onSelect(isSel ? null : item.name)}
                className="cursor-pointer transition-colors"
                style={{
                  borderBottom: "1px solid rgba(51,65,85,0.4)",
                  backgroundColor: isSel ? (accentColor ? accentColor + "14" : "rgba(59,130,246,0.1)") : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}>
                <td className="px-4 py-2.5 text-left">
                  <span className="font-semibold text-sm text-slate-200">{item.name}</span>
                  <span className="ml-2 text-[11px] text-slate-600">{item.stockCount}只</span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm font-medium"
                  style={{ color: changeColor(item.recentChange) }}>
                  {formatPct(item.recentChange)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm font-medium"
                  style={{ color: changeColor(item.todayChange) }}>
                  {formatPct(item.todayChange)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm font-medium"
                  style={{ color: changeColor(item.periodChange) }}>
                  {formatPct(item.periodChange)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-400">
                  {item.volumeRatio.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-400">
                  {item.stockCount}
                </td>
              </tr>
            );
          })}
          {sectors.length === 0 && !loading && (
            <tr>
              <td colSpan={COLUMNS.length} className="py-14 text-center text-sm text-slate-600">
                暂无板块数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SectorTable;
