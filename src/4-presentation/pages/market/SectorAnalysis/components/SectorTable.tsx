/**
 * SectorTable — 板块数据列表（全宽深色表格）
 * 列: 板块名+成分股数 | 近N日涨幅 | 今日涨跌 | 累计强度 | 量比 | 成分股 | 象限
 * 支持排序、行点击下钻
 */

import { type FC } from "react";
import type { FlatSectorItem } from "@data/repository/sector";
import { getQuadrantLabel, getQuadrantColor } from "@service/sector/SectorService";
import type { SortField, SortDir } from "@service/sector/SectorService";

interface Props {
  sectors: FlatSectorItem[];
  selectedSector: string | null;
  onSelect: (name: string | null) => void;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField, dir: SortDir) => void;
  loading: boolean;
  /** 隐藏象限列（分组视图下象限由区块标题表示） */
  hideQuadrantCol?: boolean;
}

/** 列定义 */
interface Column {
  key: SortField | "quadrant";
  label: string;
  sortable: boolean;
  width: string;
  align: "left" | "center" | "right";
}

function buildColumns(hideQuadrant: boolean): Column[] {
  const cols: Column[] = [
    { key: "name", label: "板块", sortable: true, width: "auto", align: "left" },
    { key: "recentChange", label: "近N日涨幅", sortable: true, width: "100px", align: "right" },
    { key: "todayChange", label: "今日涨幅", sortable: true, width: "90px", align: "right" },
    { key: "periodChange", label: "累计强度", sortable: true, width: "90px", align: "right" },
    { key: "volumeRatio", label: "量比", sortable: true, width: "70px", align: "right" },
    { key: "stockCount", label: "成分股", sortable: true, width: "65px", align: "right" },
  ];
  if (!hideQuadrant) {
    cols.push({ key: "quadrant", label: "象限", sortable: false, width: "80px", align: "center" });
  }
  return cols;
}

/** 涨跌颜色 */
function changeColor(v: number): string {
  if (v > 0) return "var(--stock-up)";
  if (v < 0) return "var(--stock-down)";
  return "var(--stock-flat)";
}

/** 格式化百分比 */
function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

/** 排序指示符 */
function sortIndicator(field: SortField, currentField: SortField, currentDir: SortDir): string {
  if (field !== currentField) return "";
  return currentDir === "asc" ? " ▲" : " ▼";
}

const SectorTable: FC<Props> = ({
  sectors, selectedSector, onSelect, sortField, sortDir, onSort, loading, hideQuadrantCol = false,
}) => {
  const columns = buildColumns(hideQuadrantCol);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      onSort(field, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSort(field, "desc");
    }
  };

  if (loading && sectors.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-red-400" />
          加载板块数据…
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {/* 表头 */}
        <thead>
          <tr style={{ backgroundColor: "rgba(0,0,0,0.25)" }}>
            {columns.map((col) => {
              const isActive = col.key === sortField;
              return (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-500"
                  style={{ textAlign: col.align, width: col.width, minWidth: col.width }}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key as SortField)}
                      className="transition-colors hover:text-slate-300"
                      style={isActive ? { color: "#e2e8f0" } : undefined}
                    >
                      {col.label}
                      <span className="ml-0.5 text-[10px] text-slate-600">
                        {sortIndicator(col.key as SortField, sortField, sortDir) || " ⇅"}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {/* 表体 */}
        <tbody>
          {sectors.map((item) => {
            const isSelected = selectedSector === item.name;
            return (
              <tr
                key={item.name}
                onClick={() => onSelect(isSelected ? null : item.name)}
                className="cursor-pointer transition-colors"
                style={{
                  borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
                  backgroundColor: isSelected ? "rgba(59, 130, 246, 0.12)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                {/* 板块名称 */}
                <td className="px-4 py-3 text-left">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[11px] text-slate-600">{item.stockCount}只</span>
                  </div>
                </td>

                {/* 近N日涨幅 */}
                <td className="px-4 py-3 text-right font-mono text-sm font-medium" style={{ color: changeColor(item.recentChange) }}>
                  {formatPct(item.recentChange)}
                </td>

                {/* 今日涨幅 */}
                <td className="px-4 py-3 text-right font-mono text-sm font-medium" style={{ color: changeColor(item.todayChange) }}>
                  {formatPct(item.todayChange)}
                </td>

                {/* 累计强度 */}
                <td className="px-4 py-3 text-right font-mono text-sm font-medium" style={{ color: changeColor(item.periodChange) }}>
                  {formatPct(item.periodChange)}
                </td>

                {/* 量比 */}
                <td className="px-4 py-3 text-right font-mono text-sm text-slate-400">
                  {item.volumeRatio.toFixed(2)}
                </td>

                {/* 成分股 */}
                <td className="px-4 py-3 text-right font-mono text-sm text-slate-400">
                  {item.stockCount}
                </td>

                {/* 象限标签（仅在合并视图显示） */}
                {!hideQuadrantCol && (
                  <td className="px-4 py-3 text-center">
                    <span
                      className="inline-block rounded px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: `${getQuadrantColor(item.quadrant)}20`,
                        color: getQuadrantColor(item.quadrant),
                      }}
                    >
                      {getQuadrantLabel(item.quadrant)}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}

          {/* 空数据提示 */}
          {sectors.length === 0 && !loading && (
            <tr>
              <td colSpan={columns.length} className="py-14 text-center text-sm text-slate-500">
                暂无匹配的板块数据 — 尝试调整筛选条件或清除搜索
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SectorTable;
