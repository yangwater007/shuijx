/**
 * QuadrantGroup — 单个象限分组区块组件
 * 带色条标题栏 + 描述 + 数量 + 独立排序的表格
 */

import { useState, useMemo, type FC } from "react";
import type { FlatSectorItem } from "@data/repository/sector";
import SectorTable from "./SectorTable";
import type { SortField, SortDir } from "@service/sector/SectorService";
import { sortSectors } from "@service/sector/SectorService";

/** 象限分组配置 */
export interface QuadrantGroupConfig {
  key: "highStrong" | "highWeak" | "lowStrong" | "lowWeak";
  label: string;
  description: string;
  barColor: string;
}

/** 四象限分组配置表 */
export const QUADRANT_GROUP_CONFIGS: QuadrantGroupConfig[] = [
  {
    key: "highStrong",
    label: "强势延续",
    description: "60日涨 + 近5日涨 → 强势延续",
    barColor: "#ef4444",
  },
  {
    key: "highWeak",
    label: "高位回调",
    description: "60日涨 + 近5日跌 → 高位回调",
    barColor: "#3b82f6",
  },
  {
    key: "lowStrong",
    label: "底部反转",
    description: "60日跌 + 近5日涨 → 底部反转",
    barColor: "#f97316",
  },
  {
    key: "lowWeak",
    label: "持续走弱",
    description: "60日跌 + 近5日跌 → 持续走弱",
    barColor: "#6b7280",
  },
];

interface Props {
  config: QuadrantGroupConfig;
  sectors: FlatSectorItem[];
  selectedSector: string | null;
  onSelect: (name: string | null) => void;
  loading: boolean;
}

const QuadrantGroup: FC<Props> = ({ config, sectors, selectedSector, onSelect, loading }) => {
  // 每个象限独立的排序状态
  const [sortField, setSortField] = useState<SortField>("recentChange");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField, dir: SortDir) => {
    setSortField(field);
    setSortDir(dir);
  };

  // 本地排序
  const sortedSectors = useMemo(
    () => sortSectors(sectors, sortField, sortDir),
    [sectors, sortField, sortDir]
  );

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ backgroundColor: "var(--board-card)" }}
    >
      {/* 色条标题栏 */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          borderLeft: `4px solid ${config.barColor}`,
          borderBottom: "1px solid var(--board-border)",
        }}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white">{config.label}</h3>
          <span className="text-xs text-slate-500">({sectors.length})</span>
          <span className="hidden text-xs text-slate-600 sm:inline">
            {config.description}
          </span>
        </div>
      </div>

      {/* 表格区域 */}
      {sectors.length > 0 ? (
        <SectorTable
          sectors={sortedSectors}
          selectedSector={selectedSector}
          onSelect={onSelect}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          loading={loading}
          hideQuadrantCol
        />
      ) : (
        <div className="py-10 text-center text-xs text-slate-600">
          暂无该象限板块数据
        </div>
      )}
    </div>
  );
};

export default QuadrantGroup;
