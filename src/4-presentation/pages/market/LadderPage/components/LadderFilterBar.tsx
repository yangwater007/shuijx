/**
 * LadderFilterBar — 筛选栏：题材标签 + 行情日期 + 分享/更多
 */

import { useRef, useEffect, type FC } from "react";

/** 题材标签数据 */
export interface ThemeTag {
  name: string;
  count: number;
}

interface Props {
  /** 题材标签列表 */
  themeTags: ThemeTag[];
  /** 当前选中的题材（null 表示全部） */
  selectedTheme: string | null;
  /** 题材选择回调 */
  onThemeSelect: (theme: string | null) => void;
  /** 当前日期 */
  currentDate: string;
  /** 列表视图模式 */
  isListView?: boolean;
  /** 是否按层级分组（列表视图） */
  groupByLevel?: boolean;
  /** 切换按层级分组 */
  onToggleGroupByLevel?: () => void;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 加载状态 */
  loading?: boolean;
}

const LadderFilterBar: FC<Props> = ({
  themeTags,
  selectedTheme,
  onThemeSelect,
  currentDate,
  isListView,
  groupByLevel,
  onToggleGroupByLevel,
  onRefresh,
  loading,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 鼠标滚轮横向滚动 */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  return (
    <div
      className="mb-4 rounded-lg p-3"
      style={{ backgroundColor: "var(--board-card)" }}
    >
      {/* 第一行：题材标签 + 控件 */}
      <div className="flex items-center gap-3">
        {/* 题材标签滚动区 */}
        <div
          ref={scrollRef}
          className="flex flex-1 gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* 全部标签 */}
          <button
            type="button"
            onClick={() => onThemeSelect(null)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: selectedTheme === null ? "#3b82f6" : "var(--board-bg)",
              color: selectedTheme === null ? "#fff" : "var(--stock-flat)",
              border: selectedTheme === null ? "none" : "1px solid var(--board-border)",
            }}
          >
            全部
          </button>

          {themeTags.map((tag) => {
            const isActive = selectedTheme === tag.name;
            return (
              <button
                key={tag.name}
                type="button"
                onClick={() => onThemeSelect(isActive ? null : tag.name)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs transition-colors"
                style={{
                  backgroundColor: isActive ? "#3b82f6" : "var(--board-bg)",
                  color: isActive ? "#fff" : "var(--stock-flat)",
                  border: isActive ? "none" : "1px solid var(--board-border)",
                }}
              >
                {tag.name}
                <span className="ml-1 opacity-70">{tag.count}</span>
              </button>
            );
          })}
        </div>

        {/* 右侧控件 */}
        <div className="flex shrink-0 items-center gap-2">
          {/* 行情日期 */}
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
          >
            📅 {currentDate}
          </button>

          {/* 分享按钮 */}
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
          >
            分享
          </button>

          {/* 更多按钮 */}
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
          >
            更多 ▾
          </button>
        </div>
      </div>

      {/* 第二行：列表视图专属控件 */}
      {isListView && (
        <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--board-border)" }}>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
          >
            🃏 卡片视图
          </button>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--stock-flat)" }}>
              <span>按层级</span>
              <input
                type="checkbox"
                checked={groupByLevel}
                onChange={onToggleGroupByLevel}
                className="rounded"
              />
            </label>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "var(--board-bg)", color: "var(--stock-flat)", border: "1px solid var(--board-border)" }}
            >
              {loading ? "刷新中..." : "🔄 刷新行情"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LadderFilterBar;
