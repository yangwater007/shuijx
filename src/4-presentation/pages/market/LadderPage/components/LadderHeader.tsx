/**
 * LadderHeader — 顶部导航栏：标题 + 视图切换
 */

import type { FC } from "react";

export type ViewMode = "single" | "multi" | "list";

interface Props {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const VIEWS: { key: ViewMode; label: string; icon: string }[] = [
  { key: "single", label: "单日", icon: "📅" },
  { key: "multi", label: "多日", icon: "📊" },
  { key: "list", label: "列表", icon: "📋" },
];

const LadderHeader: FC<Props> = ({ activeView, onViewChange }) => {
  return (
    <div className="mb-4 flex items-center justify-between">
      {/* 标题 */}
      <h1 className="text-xl font-bold text-white">连板天梯</h1>

      {/* 视图切换按钮组 */}
      <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--board-border)" }}>
        {VIEWS.map((v) => {
          const isActive = activeView === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onViewChange(v.key)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "#3b82f6" : "var(--board-card)",
                color: isActive ? "#fff" : "var(--stock-flat)",
                borderRight: v.key !== "list" ? "1px solid var(--board-border)" : "none",
              }}
            >
              <span className="text-base">{v.icon}</span>
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* 右侧占位：用户头像区域 */}
      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: "var(--board-card)", border: "1px solid var(--board-border)" }} />
    </div>
  );
};

export default LadderHeader;
