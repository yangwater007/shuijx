/**
 * LadderMultiDayHeader — 多日视图专属顶部栏
 */

import type { FC } from "react";

interface Props {
  /** 日期范围文本 */
  dateRange: string;
  /** 是否选中最近7日 */
  recentDays: boolean;
  /** 切换最近7日/自定义 */
  onToggleRecentDays: () => void;
  /** 刷新数据 */
  onRefresh: () => void;
  /** 是否显示共识标签 */
  showConsensus: boolean;
  /** 切换共识标签 */
  onToggleConsensus: () => void;
  /** 打开显示设置 */
  onOpenSettings: () => void;
  /** 加载中 */
  loading?: boolean;
}

const LadderMultiDayHeader: FC<Props> = ({
  dateRange,
  recentDays,
  onToggleRecentDays,
  onRefresh,
  showConsensus,
  onToggleConsensus,
  onOpenSettings,
  loading,
}) => {
  return (
    <div
      className="mb-4 flex items-center justify-between rounded-lg p-3"
      style={{ backgroundColor: "var(--board-card)" }}
    >
      {/* 左侧：日期选择 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleRecentDays}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            backgroundColor: recentDays ? "#3b82f6" : "var(--board-bg)",
            color: recentDays ? "#fff" : "var(--stock-flat)",
            border: recentDays ? "none" : "1px solid var(--board-border)",
          }}
        >
          最近7个交易日
        </button>

        <button
          type="button"
          onClick={onToggleRecentDays}
          className="rounded-lg px-3 py-1.5 text-xs transition-colors"
          style={{
            backgroundColor: !recentDays ? "#3b82f6" : "var(--board-bg)",
            color: !recentDays ? "#fff" : "var(--stock-flat)",
            border: !recentDays ? "none" : "1px solid var(--board-border)",
          }}
        >
          自定义
        </button>

        <span className="ml-2 text-xs text-slate-400">{dateRange}</span>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="ml-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
        >
          {loading ? "刷新中..." : "🔄 刷新"}
        </button>
      </div>

      {/* 右侧：共识标签 + 显示设置 */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--stock-flat)" }}>
          <span>共识标签</span>
          <input
            type="checkbox"
            checked={showConsensus}
            onChange={onToggleConsensus}
            className="rounded"
          />
        </label>

        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:opacity-80"
          style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
        >
          显示设置
        </button>
      </div>
    </div>
  );
};

export default LadderMultiDayHeader;
