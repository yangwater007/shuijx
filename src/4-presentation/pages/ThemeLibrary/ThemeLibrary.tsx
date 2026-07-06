/**
 * ThemeLibrary — 题材库（完整复刻 quicktiny 三视图）
 * KPL表格 / Concept分类卡片 / Graph关系图
 * 点击龙头股 → StockDetailModal
 */

import { useState, type FC, type ChangeEvent, useMemo } from "react";
import useThemeLibrary from "@business/themes/useThemeLibrary";
import type { ThemeNode, ThemeEdge } from "@infra/types/themes";
import { THEME_VIEWS } from "@infra/types/themes";
import { getStageColor, getTrendIcon, getTrendColor } from "@service/themes/ThemeService";
import StockDetailModal from "@ui/components/business/StockDetailModal";
import type { StockBrief } from "@ui/components/business/StockDetailModal";

const C = {
  bg: "#0b0e14",
  card: "#131a24",
  border: "#1e2a36",
  accent: "#f6b26b",
  text: "#e8edf5",
  sub: "#9aaec9",
  dim: "#4a6a8a",
  up: "#ef4444",
  down: "#22c55e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
};

// ═══ KPL 小表格 ═══════════════════════════════════════

const KPLView: FC<{
  nodes: ThemeNode[];
  selected: string | null;
  onSelect: (name: string) => void;
  onStockClick: (stock: StockBrief) => void;
  sortBy: string;
  onSort: (field: string) => void;
}> = ({ nodes, selected, onSelect, onStockClick, sortBy, onSort }) => {
  const SortHeader: FC<{ field: string; children: string; className?: string }> = ({ field, children, className }) => (
    <th className={"px-3 py-3 text-xs font-medium cursor-pointer select-none " + (className ?? "text-left")}
      style={{ color: sortBy === field ? C.accent : C.dim }}
      onClick={() => onSort(field)}>
      {children} {sortBy === field ? "▼" : ""}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid " + C.border, backgroundColor: "rgba(0,0,0,0.15)" }}>
            <SortHeader field="name">题材名称</SortHeader>
            <SortHeader field="limitUpCount" className="text-center">涨停数</SortHeader>
            <SortHeader field="maxContinueNum" className="text-center">最高板</SortHeader>
            <th className="px-3 py-3 text-xs font-medium text-left" style={{ color: C.dim }}>龙头股</th>
            <SortHeader field="stage" className="text-center">阶段</SortHeader>
            <SortHeader field="change" className="text-center">变化</SortHeader>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n, idx) => {
            const isSel = selected === n.name;
            return (
              <tr key={n.name}
                className="cursor-pointer transition-colors"
                style={{
                  backgroundColor: isSel ? C.accent + "12" : (idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"),
                  borderBottom: "1px solid rgba(30,42,54,0.6)",
                }}
                onClick={() => onSelect(n.name)}
                onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)"; }}
              >
                {/* 题材名 */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px]">{n.categoryInfo.icon}</span>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: C.text }}>{n.name}</div>
                      <div className="text-[10px]" style={{ color: C.dim }}>{n.categoryInfo.name}</div>
                    </div>
                  </div>
                </td>
                {/* 涨停数 */}
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] h-6 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: n.limitUpCount >= 10 ? C.up + "22" : n.limitUpCount >= 5 ? C.accent + "22" : "transparent",
                      color: n.limitUpCount >= 10 ? C.up : n.limitUpCount >= 5 ? C.accent : C.sub,
                    }}>
                    {n.limitUpCount}
                  </span>
                </td>
                {/* 最高板 */}
                <td className="px-3 py-3 text-center">
                  <span className="font-mono font-bold" style={{ color: n.maxContinueNum >= 3 ? C.up : C.accent }}>
                    {n.maxContinueNum}板
                  </span>
                </td>
                {/* 龙头 */}
                <td className="px-3 py-3">
                  {n.dragonHead ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onStockClick({ code: n.dragonHead!.code, name: n.dragonHead!.name }); }}
                      className="group flex items-center gap-1.5 rounded-md px-2 py-1 -ml-2 transition-colors hover:bg-white/10"
                      title="点击查看个股详情"
                    >
                      <span className="font-medium text-sm" style={{ color: C.text }}>{n.dragonHead.name}</span>
                      <span className="font-mono text-[11px]" style={{ color: C.dim }}>{n.dragonHead.code}</span>
                      <span className="text-[10px] group-hover:opacity-100 opacity-0 transition-opacity" style={{ color: C.blue }}>→</span>
                    </button>
                  ) : (
                    <span style={{ color: C.dim }}>—</span>
                  )}
                  {n.dragonHead && (
                    <div className="text-[10px] mt-0.5" style={{ color: C.accent }}>{n.dragonHead.continueNum}连板</div>
                  )}
                </td>
                {/* 阶段 */}
                <td className="px-3 py-3 text-center">
                  <span className="inline-block rounded-full px-2.5 py-1 text-[10px] font-medium"
                    style={{ backgroundColor: getStageColor(n.stage) + "18", color: getStageColor(n.stage) }}>
                    {n.stageLabel}
                  </span>
                </td>
                {/* 变化 */}
                <td className="px-3 py-3 text-center">
                  <span className="font-bold text-xs" style={{ color: getTrendColor(n.change.trend) }}>
                    {getTrendIcon(n.change.trend)} {n.change.count > 0 ? "+" : ""}{n.change.count}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ═══ Concept 分类卡片 ═══════════════════════════════

const ConceptView: FC<{
  groups: Map<string, ThemeNode[]>;
  onSelect: (name: string) => void;
  onStockClick: (stock: StockBrief) => void;
  selected: string | null;
}> = ({ groups, onSelect, onStockClick, selected }) => (
  <div className="space-y-5">
    {[...groups.entries()].map(([cat, nodes]) => {
      const catInfo = nodes[0]?.categoryInfo;
      const totalStocks = nodes.reduce((s, n) => s + n.limitUpCount, 0);
      return (
        <div key={cat} className="rounded-xl overflow-hidden" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
          {/* 分类标题栏 */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: C.border, backgroundColor: "rgba(0,0,0,0.1)" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">{catInfo?.icon ?? "📂"}</span>
              <div>
                <h3 className="text-sm font-bold" style={{ color: C.text }}>{cat}</h3>
                <span className="text-[10px]" style={{ color: C.dim }}>{nodes.length}个题材 · {totalStocks}只涨停</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catInfo?.color ?? C.accent }} />
              <span className="text-[10px]" style={{ color: catInfo?.color ?? C.accent }}>
                {nodes.filter(n => n.stage === "climax" || n.stage === "rising").length}个活跃
              </span>
            </div>
          </div>
          {/* 题材网格 */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {nodes.sort((a, b) => b.limitUpCount - a.limitUpCount).map((n) => {
              const isSel = selected === n.name;
              return (
                <div key={n.name}
                  onClick={() => onSelect(n.name)}
                  className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: isSel ? C.accent + "10" : C.bg,
                    border: "1px solid " + (isSel ? C.accent : C.border),
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm" style={{ color: isSel ? C.accent : C.text }}>{n.name}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ backgroundColor: C.up + "18", color: C.up }}>{n.limitUpCount}</span>
                  </div>
                  {n.dragonHead ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onStockClick({ code: n.dragonHead!.code, name: n.dragonHead!.name }); }}
                      className="text-left w-full rounded px-1.5 py-1 -ml-1.5 text-xs transition-colors hover:bg-white/5"
                      title="点击查看个股"
                    >
                      <span style={{ color: C.sub }}>龙头 </span>
                      <span style={{ color: C.text }}>{n.dragonHead.name}</span>
                      <span className="ml-1 font-mono text-[10px]" style={{ color: C.dim }}>{n.dragonHead.code}</span>
                    </button>
                  ) : (
                    <div className="text-xs" style={{ color: C.dim }}>暂无龙头</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px]">
                    <span className="rounded px-1.5 py-0.5" style={{ backgroundColor: getStageColor(n.stage) + "18", color: getStageColor(n.stage) }}>{n.stageLabel}</span>
                    <span style={{ color: getTrendColor(n.change.trend) }}>{getTrendIcon(n.change.trend)}{n.change.count > 0 ? "+" : ""}{n.change.count}</span>
                    {n.maxContinueNum >= 2 && <span style={{ color: C.accent }}>{n.maxContinueNum}板</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
  </div>
);

// ═══ Graph 关系图 ═══════════════════════════════════

const GraphView: FC<{
  nodes: ThemeNode[];
  edges: ThemeEdge[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  onStockClick: (stock: StockBrief) => void;
}> = ({ nodes, edges, selected, onSelect, onStockClick }) => {
  const relatedEdges = useMemo(
    () => selected ? edges.filter(e => e.source === selected || e.target === selected) : edges,
    [edges, selected]
  );

  // 按涨停数排序，前10大
  const topNodes = useMemo(() => [...nodes].sort((a, b) => b.limitUpCount - a.limitUpCount), [nodes]);

  return (
    <div className="space-y-4">
      {/* 关联关系图（简化：双向列表） */}
      <div className="rounded-xl p-5" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: C.text }}>
          🔗 {selected ? ("「" + selected + "」的关联题材") : "题材关联网络"}
          {selected && <span className="text-xs font-normal" style={{ color: C.dim }}>({relatedEdges.length}条关联)</span>}
        </h3>

        {selected ? (
          <div className="space-y-3">
            {relatedEdges.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: C.dim }}>该题材暂无关联数据</p>
            )}
            {/* 上游 */}
            {relatedEdges.filter(e => e.type === "upstream" && e.target === selected).length > 0 && (
              <div>
                <div className="text-[10px] font-medium mb-2 px-1" style={{ color: C.up }}>▲ 上游驱动</div>
                <div className="flex flex-wrap gap-2">
                  {relatedEdges.filter(e => e.type === "upstream" && e.target === selected).map(e => {
                    const node = nodes.find(n => n.name === e.source);
                    return node ? (
                      <button key={e.source} onClick={() => onSelect(e.source)}
                        className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                        style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }}>
                        {node.categoryInfo.icon} {e.source}
                        <span className="ml-1.5 font-bold" style={{ color: C.up }}>{node.limitUpCount}</span>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            {/* 下游 */}
            {relatedEdges.filter(e => e.type === "downstream" && e.source === selected).length > 0 && (
              <div>
                <div className="text-[10px] font-medium mb-2 px-1" style={{ color: C.down }}>▼ 下游扩散</div>
                <div className="flex flex-wrap gap-2">
                  {relatedEdges.filter(e => e.type === "downstream" && e.source === selected).map(e => {
                    const node = nodes.find(n => n.name === e.target);
                    return node ? (
                      <button key={e.target} onClick={() => onSelect(e.target)}
                        className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                        style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }}>
                        {node.categoryInfo.icon} {e.target}
                        <span className="ml-1.5 font-bold" style={{ color: C.up }}>{node.limitUpCount}</span>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            {/* 相关 */}
            {relatedEdges.filter(e => e.type === "related").length > 0 && (
              <div>
                <div className="text-[10px] font-medium mb-2 px-1" style={{ color: C.blue }}>◆ 相关联动</div>
                <div className="flex flex-wrap gap-2">
                  {relatedEdges.filter(e => e.type === "related").map(e => {
                    const other = e.source === selected ? e.target : e.source;
                    const node = nodes.find(n => n.name === other);
                    return node ? (
                      <button key={other} onClick={() => onSelect(other)}
                        className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                        style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }}>
                        {node.categoryInfo.icon} {other}
                        <span className="ml-1.5 font-bold" style={{ color: C.up }}>{node.limitUpCount}</span>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {topNodes.slice(0, 20).map(n => (
              <button key={n.name} onClick={() => onSelect(n.name)}
                className="rounded-lg px-3 py-2 text-xs text-left transition-colors hover:bg-white/5"
                style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span>{n.categoryInfo.icon}</span>
                  <span className="font-bold">{n.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: C.up }}>{n.limitUpCount}只涨停</span>
                  <span className="rounded px-1 py-0.5" style={{ backgroundColor: getStageColor(n.stage) + "18", color: getStageColor(n.stage) }}>{n.stageLabel}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 统计汇总 */}
        {!selected && (
          <div className="mt-5 pt-4 border-t flex gap-6 text-xs" style={{ borderColor: C.border }}>
            <span style={{ color: C.sub }}>总题材: <strong style={{ color: C.text }}>{nodes.length}</strong></span>
            <span style={{ color: C.sub }}>总涨停: <strong style={{ color: C.up }}>{nodes.reduce((s,n) => s + n.limitUpCount, 0)}只</strong></span>
            <span style={{ color: C.sub }}>关联边: <strong style={{ color: C.text }}>{edges.length}</strong></span>
            <span style={{ color: C.sub }}>热门: <strong style={{ color: C.accent }}>{nodes.filter(n => n.stage === "climax" || n.stage === "rising").length}个</strong></span>
          </div>
        )}
      </div>

      {/* 选中题材的龙头股 */}
      {selected && (() => {
        const node = nodes.find(n => n.name === selected);
        if (!node?.dragonHead) return null;
        return (
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
            <div className="flex items-center gap-3">
              <span className="text-lg">🐲</span>
              <div>
                <div className="text-xs" style={{ color: C.sub }}>「{selected}」龙头股</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-sm" style={{ color: C.text }}>{node.dragonHead.name}</span>
                  <span className="font-mono text-xs" style={{ color: C.dim }}>{node.dragonHead.code}</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: C.up + "18", color: C.up }}>{node.dragonHead.continueNum}连板</span>
                </div>
              </div>
            </div>
            <button onClick={() => onStockClick({ code: node.dragonHead!.code, name: node.dragonHead!.name })}
              className="rounded-lg px-4 py-2 text-xs font-bold transition-colors hover:opacity-90"
              style={{ backgroundColor: C.accent, color: C.bg }}>
              查看详情 →
            </button>
          </div>
        );
      })()}
    </div>
  );
};

// ═══ 主页面 ═══════════════════════════════════════

const ThemeLibrary: FC = () => {
  const {
    loading, error,
    view, setView,
    search, setSearch,
    selectedTheme, selectTheme,
    kplNodes, conceptGroups, graphNodes, graphEdges,
    refresh,
  } = useThemeLibrary();

  const [sortKPL, setSortKPL] = useState("limitUpCount");
  const [modalStock, setModalStock] = useState<StockBrief | null>(null);

  // KPL排序
  const sortedKPL = useMemo(() => {
    const list = search ? kplNodes.filter(n => n.name.includes(search)) : [...kplNodes];
    switch (sortKPL) {
      case "name": return list.sort((a, b) => a.name.localeCompare(b.name));
      case "limitUpCount": return list.sort((a, b) => b.limitUpCount - a.limitUpCount);
      case "maxContinueNum": return list.sort((a, b) => b.maxContinueNum - a.maxContinueNum);
      case "stage": {
        const order: Record<string, number> = { climax: 0, rising: 1, divergence: 2, fading: 3 };
        return list.sort((a, b) => (order[a.stage] ?? 9) - (order[b.stage] ?? 9));
      }
      case "change": return list.sort((a, b) => b.change.count - a.change.count);
      default: return list;
    }
  }, [kplNodes, search, sortKPL]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: C.bg }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <span style={{ color: C.dim }}>加载题材数据...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: C.bg }}>
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
          <p className="mb-3" style={{ color: C.up }}>加载失败: {error}</p>
          <button type="button" onClick={refresh} className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: C.accent, color: C.bg }}>重试</button>
        </div>
      </div>
    );
  }

  const totalLimitUp = kplNodes.reduce((s, n) => s + n.limitUpCount, 0);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: C.bg }}>
      {/* 顶栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b" style={{ borderColor: C.border, backgroundColor: C.card }}>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold" style={{ color: C.text }}>题材库</h1>
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: C.sub }}><strong style={{ color: C.text }}>{kplNodes.length}</strong> 个题材</span>
            <span style={{ color: C.sub }}><strong style={{ color: C.up }}>{totalLimitUp}</strong> 只涨停</span>
            <span style={{ color: C.sub }}><strong style={{ color: C.accent }}>{graphEdges.length}</strong> 条关联</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 视图切换 */}
          <div className="flex rounded-lg p-0.5" style={{ backgroundColor: C.bg, border: "1px solid " + C.border }}>
            {THEME_VIEWS.map((v) => (
              <button key={v.key} type="button" onClick={() => setView(v.key)}
                className="rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: view === v.key ? C.accent : "transparent",
                  color: view === v.key ? C.bg : C.sub,
                }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          <input type="text" value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="搜索题材..."
            className="rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border, width: 150 }} />

          <button type="button" onClick={refresh}
            className="rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5" style={{ color: C.dim }} title="刷新">
            🔄
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-4 md:p-5">
        {view === "kpl" && (
          <KPLView
            nodes={sortedKPL}
            selected={selectedTheme}
            onSelect={selectTheme}
            onStockClick={setModalStock}
            sortBy={sortKPL}
            onSort={setSortKPL}
          />
        )}
        {view === "concept" && (
          <ConceptView
            groups={conceptGroups}
            onSelect={selectTheme}
            onStockClick={setModalStock}
            selected={selectedTheme}
          />
        )}
        {view === "graph" && (
          <GraphView
            nodes={graphNodes}
            edges={graphEdges}
            selected={selectedTheme}
            onSelect={selectTheme}
            onStockClick={setModalStock}
          />
        )}
      </div>

      {/* 个股弹窗 */}
      <StockDetailModal
        visible={modalStock !== null}
        stock={modalStock}
        onClose={() => setModalStock(null)}
      />
    </div>
  );
};

export default ThemeLibrary;
