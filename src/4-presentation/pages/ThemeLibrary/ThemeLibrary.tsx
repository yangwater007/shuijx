/** 表现层 — 题材库页面 */

import { useState, type FC, type ChangeEvent } from "react";
import { STOCK_UP } from "@infra/config";
import useThemeLibrary from "@business/theme/useThemeLibrary";
import PageHeader from "@ui/components/PageHeader";
import StockTag from "@ui/components/StockTag";
import type { Theme, ThemeDetail } from "@data/dto/theme";
import type { Stock } from "@infra/types/stock";

/** 题材卡片 */
const ThemeCard: FC<{
  theme: Theme;
  onClick: (id: string) => void;
}> = ({ theme, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(theme.id)}
    className="w-full rounded-xl p-4 text-left transition-colors hover:opacity-80"
    style={{ backgroundColor: "var(--board-card)" }}
  >
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-white">{theme.name}</h4>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
          {theme.description}
        </p>
      </div>
      <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-slate-500">
          {theme.stockCount} 只
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: theme.heat > 60 ? `${STOCK_UP}30` : "var(--board-border)",
            color: theme.heat > 60 ? STOCK_UP : "var(--stock-flat)",
          }}
        >
          热度 {theme.heat}
        </span>
      </div>
    </div>
  </button>
);

/** 分类标签 */
const CategoryTag: FC<{
  name: string;
  active: boolean;
  onClick: () => void;
  count: number;
}> = ({ name, active, onClick, count }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-lg px-4 py-2 text-left text-sm transition-colors"
    style={{
      backgroundColor: active ? `${STOCK_UP}20` : "transparent",
      color: active ? STOCK_UP : "var(--stock-flat)",
    }}
  >
    <span>{name}</span>
    <span className="ml-2 text-xs opacity-60">({count})</span>
  </button>
);

/** 详情弹窗 */
const DetailModal: FC<{
  detail: ThemeDetail;
  onClose: () => void;
}> = ({ detail, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    onClick={onClose}
  >
    <div
      className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6"
      style={{ backgroundColor: "var(--board-card)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{detail.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{detail.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-1 text-sm text-slate-400 transition-colors hover:text-white"
          style={{ border: "1px solid var(--board-border)" }}
        >
          关闭
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: "var(--board-bg)" }}>
          <div className="text-lg font-bold" style={{ color: STOCK_UP }}>{detail.stockCount}</div>
          <div className="text-xs text-slate-500">关联股票</div>
        </div>
        <div className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: "var(--board-bg)" }}>
          <div className="text-lg font-bold" style={{ color: STOCK_UP }}>{detail.heat}</div>
          <div className="text-xs text-slate-500">热度</div>
        </div>
      </div>

      {detail.leaderCode && (
        <div className="mb-4">
          <span className="text-sm text-slate-400">龙头股：</span>
          <span className="text-sm font-medium" style={{ color: STOCK_UP }}>
            {detail.leaderCode}
          </span>
        </div>
      )}

      <h3 className="mb-3 text-sm font-bold text-slate-300">关联股票</h3>
      <div className="flex flex-wrap gap-2">
        {detail.stocks.map((stock: Stock) => (
          <StockTag
            key={stock.code}
            code={stock.code}
            name={stock.name}
            changePct={stock.changePct}
          />
        ))}
      </div>
    </div>
  </div>
);

const ThemeLibrary: FC = () => {
  const {
    displayCategories,
    displayThemes,
    loading,
    searchKeyword,
    setSearchKeyword,
    selectedDetail,
    selectTheme,
    closeDetail,
    refresh,
  } = useThemeLibrary();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredThemes = activeCategory
    ? displayThemes.filter((t) => t.category === activeCategory)
    : displayThemes;

  return (
    <div>
      <PageHeader title="题材库" subtitle="系统化梳理 A 股市场题材概念">
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            backgroundColor: "var(--board-card)",
            color: "#e2e8f0",
            border: "1px solid var(--board-border)",
          }}
        >
          {loading ? "加载中..." : "刷新"}
        </button>
      </PageHeader>

      {/* 搜索栏 */}
      <div className="mb-4">
        <input
          type="text"
          value={searchKeyword}
          placeholder="搜索题材名称或描述..."
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setSearchKeyword(e.target.value)
          }
          className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
          style={{
            backgroundColor: "var(--board-card)",
            border: "1px solid var(--board-border)",
          }}
        />
      </div>

      <div className="flex gap-6">
        {/* 分类导航 */}
        <div className="w-44 shrink-0">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className="w-full rounded-lg px-4 py-2 text-left text-sm transition-colors"
            style={{
              backgroundColor: activeCategory === null ? `${STOCK_UP}20` : "transparent",
              color: activeCategory === null ? STOCK_UP : "var(--stock-flat)",
            }}
          >
            全部 ({displayThemes.length})
          </button>
          <div className="mt-1 space-y-0.5">
            {displayCategories.map((cat) => (
              <CategoryTag
                key={cat.name}
                name={cat.name}
                active={activeCategory === cat.name}
                count={cat.themes.length}
                onClick={() => setActiveCategory(cat.name)}
              />
            ))}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="min-w-0 flex-1">
          {/* 加载态 */}
          {loading && displayThemes.length === 0 && (
            <div className="flex h-40 items-center justify-center">
              <p className="text-slate-500">加载中...</p>
            </div>
          )}

          {/* 空数据态 */}
          {!loading && displayThemes.length === 0 && (
            <div
              className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed"
              style={{
                borderColor: "var(--board-border)",
                backgroundColor: "var(--board-card)",
              }}
            >
              <div className="text-center">
                <p className="text-lg text-slate-400">
                  {searchKeyword ? "未找到匹配题材" : "暂无题材数据"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {searchKeyword ? "尝试其他关键词" : "等待 API 对接后可展示实时题材库"}
                </p>
              </div>
            </div>
          )}

          {/* 题材网格 */}
          {!loading && filteredThemes.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  onClick={(id) => void selectTheme(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedDetail && (
        <DetailModal detail={selectedDetail} onClose={closeDetail} />
      )}
    </div>
  );
};

export default ThemeLibrary;
