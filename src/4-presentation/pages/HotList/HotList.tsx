/** 表现层 — 热榜页面 */

import { useState, type FC } from "react";
import { STOCK_UP, STOCK_DOWN } from "@infra/config";
import useHotList from "@business/hot/useHotList";
import PageHeader from "@ui/components/PageHeader";
import HotRankBar from "@ui/components/HotRankBar";
import StockDetailModal from "@ui/components/business/StockDetailModal";
import type { HotStockItem, HotNewsItem } from "@infra/types/stock";
import type { HotTab } from "@business/hot/useHotList";

// ─── 股票热榜行 ────────────────────────

const StockRow: FC<{ item: HotStockItem; maxHeat: number }> = ({ item, maxHeat }) => {
  const isUp = item.changePct >= 0;
  const changeColor = isUp ? STOCK_UP : STOCK_DOWN;

  return (
    <div className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-white/[0.04]"
      style={{ backgroundColor: "var(--board-card)" }}>
      {/* 排名 */}
      <span className="w-9 text-center text-lg font-bold"
        style={{ color: item.rank <= 3 ? STOCK_UP : "var(--stock-flat)" }}>
        {item.rank <= 3 ? ["🥇","🥈","🥉"][item.rank - 1] : item.rank}
      </span>

      {/* 排名变化 */}
      {item.rankChange !== 0 && (
        <span className="w-6 text-center text-xs" style={{ color: item.rankChange > 0 ? STOCK_UP : STOCK_DOWN }}>
          {item.rankChange > 0 ? "↑" : "↓"}{Math.abs(item.rankChange)}
        </span>
      )}
      {item.rankChange === 0 && <span className="w-6 text-center text-xs text-slate-600">—</span>}

      {/* 股票信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{item.name}</span>
          <span className="text-xs text-slate-500">{item.code}</span>
          {item.popularityTag && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: "rgba(246,178,107,0.15)", color: "#f6b26b" }}>
              {item.popularityTag}
            </span>
          )}
        </div>
        {/* 概念标签 */}
        {item.conceptTags.length > 0 && (
          <div className="mt-1 flex gap-1">
            {item.conceptTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* 涨跌幅 */}
      <span className="w-18 text-right font-mono text-sm font-bold" style={{ color: changeColor }}>
        {isUp ? "+" : ""}{item.changePct.toFixed(2)}%
      </span>

      {/* 热度 */}
      <div className="w-24">
        <div className="mb-0.5 text-right text-xs text-slate-500">{item.heat.toLocaleString()}</div>
        <HotRankBar heat={item.heat} maxHeat={maxHeat} />
      </div>
    </div>
  );
};

// ─── 新闻热榜行 ────────────────────────

const NewsRow: FC<{ item: HotNewsItem; maxHeat: number }> = ({ item, maxHeat }) => (
  <a
    href={item.url || "#"}
    target={item.url ? "_blank" : undefined}
    rel="noopener noreferrer"
    className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-white/[0.04] no-underline"
    style={{ backgroundColor: "var(--board-card)" }}>
    <span className="w-9 text-center text-lg font-bold"
      style={{ color: item.rank <= 3 ? STOCK_UP : "var(--stock-flat)" }}>
      {item.rank <= 3 ? ["🥇","🥈","🥉"][item.rank - 1] : item.rank}
    </span>

    <div className="min-w-0 flex-1">
      <span className="font-medium text-white line-clamp-2">{item.title}</span>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
        <span>{item.source}</span>
        <span>·</span>
        <span>{item.publishTimeFormatted}</span>
        {item.category && <span className="text-slate-600">· {item.category}</span>}
      </div>
    </div>

    <div className="w-24 shrink-0">
      <div className="mb-0.5 text-right text-xs text-slate-500">{item.hotValue}</div>
      <HotRankBar heat={item.heat} maxHeat={maxHeat} />
    </div>
  </a>
);

// ─── Tab 按钮 ──────────────────────────

const TabBtn: FC<{ active: boolean; label: string; count: number; onClick: () => void }> =
  ({ active, label, count, onClick }) => (
    <button type="button" onClick={onClick} className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
      style={{ backgroundColor: active ? STOCK_UP : "var(--board-card)", color: active ? "#fff" : "var(--stock-flat)" }}>
      {label} <span className="ml-1 text-xs opacity-70">({count})</span>
    </button>
  );

// ─── 主页面 ────────────────────────────

const HotList: FC = () => {
  const { stocks, news, loading, activeTab, setActiveTab, refresh } = useHotList();
  const [modalStock, setModalStock] = useState<HotStockItem | null>(null);

  const currentList = activeTab === "stocks" ? stocks : news;
  const maxHeat = currentList.reduce((max, item) => Math.max(max, item.heat), 0);

  return (
    <div>
      <PageHeader title="热榜" subtitle="实时股票热榜与新闻热榜">
        <button type="button" onClick={refresh} disabled={loading}
          className="rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--board-card)", color: "#e2e8f0", border: "1px solid var(--board-border)" }}>
          {loading ? "刷新中..." : "刷新"}
        </button>
      </PageHeader>

      <div className="mb-4 flex gap-2">
        <TabBtn active={activeTab === "stocks"} label="股票热榜" count={stocks.length} onClick={() => setActiveTab("stocks")} />
        <TabBtn active={activeTab === "news"} label="新闻热榜" count={news.length} onClick={() => setActiveTab("news")} />
      </div>

      {loading && currentList.length === 0 && (
        <div className="flex h-40 items-center justify-center"><p className="text-slate-500">加载中...</p></div>
      )}

      {!loading && currentList.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed"
          style={{ borderColor: "var(--board-border)", backgroundColor: "var(--board-card)" }}>
          <p className="text-slate-500">暂无数据</p>
        </div>
      )}

      <div className="space-y-2">
        {activeTab === "stocks" && stocks.map((item) => (
          <div key={item.code} onClick={() => setModalStock(item)} className="cursor-pointer">
            <StockRow item={item} maxHeat={maxHeat} />
          </div>
        ))}
        {activeTab === "news" && news.map((item) => (
          <NewsRow key={`${item.rank}-${item.source}`} item={item} maxHeat={maxHeat} />
        ))}
      </div>

      {modalStock && (
        <StockDetailModal
          visible={true}
          stock={{ code: modalStock.code, name: modalStock.name, changeRate: modalStock.changePct }}
          onClose={() => setModalStock(null)}
        />
      )}
    </div>
  );
};

export default HotList;
