/**
 * ThemeLibrary — 题材库页面（KPL小表格 / Concept分类 / Graph挖掘 三视图）
 * 数据源: https://stock.quicktiny.cn/api/themes/graph
 */

import { useState, type FC, type ChangeEvent } from "react";
import useThemeLibrary from "@business/themes/useThemeLibrary";
import type { ThemeNode, ThemeEdge } from "@infra/types/themes";
import { THEME_VIEWS } from "@infra/types/themes";
import { getStageColor, getTrendIcon, getTrendColor } from "@service/themes/ThemeService";

const C = {
  bg: "#0b0e14", card: "#131a24", border: "#1e2a36",
  accent: "#f6b26b", text: "#e8edf5", sub: "#9aaec9", dim: "#4a6a8a",
  up: "#ef4444", down: "#22c55e",
};

// ════════════════════════════════════════════════
//  KPL 视图：小表格
// ════════════════════════════════════════════════

const KPLView: FC<{ nodes: ThemeNode[]; onSelect: (name: string) => void; selected: string | null }> = ({ nodes, onSelect, selected }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: "2px solid " + C.border }}>
          {["题材", "涨停", "最高板", "龙头股", "阶段", "变化"].map((h) => (
            <th key={h} className="px-3 py-2.5 text-left font-medium" style={{ color: C.dim }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {nodes.map((n) => (
          <tr key={n.name} onClick={() => onSelect(n.name)}
            className="cursor-pointer transition-colors hover:bg-white/5"
            style={{
              backgroundColor: selected === n.name ? C.accent + "10" : "transparent",
              borderBottom: "1px solid " + C.border
            }}>
            <td className="px-3 py-2.5 font-medium" style={{ color: C.text }}>{n.name}</td>
            <td className="px-3 py-2.5 font-bold" style={{ color: C.up }}>{n.limitUpCount}</td>
            <td className="px-3 py-2.5" style={{ color: C.accent }}>{n.maxContinueNum}板</td>
            <td className="px-3 py-2.5">
              {n.dragonHead ? (
                <><span style={{ color: C.text }}>{n.dragonHead.name}</span><span className="ml-1" style={{ color: C.dim }}>{n.dragonHead.code}</span></>
              ) : (
                <span style={{ color: C.dim }}>—</span>
              )}
            </td>
            <td className="px-3 py-2.5">
              <span className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ backgroundColor: getStageColor(n.stage) + "18", color: getStageColor(n.stage) }}>
                {n.stageLabel}
              </span>
            </td>
            <td className="px-3 py-2.5 font-bold" style={{ color: getTrendColor(n.change.trend) }}>
              {getTrendIcon(n.change.trend)}{n.change.count > 0 ? "+" : ""}{n.change.count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ════════════════════════════════════════════════
//  Concept 视图：按分类卡片
// ════════════════════════════════════════════════

const ConceptView: FC<{ groups: Map<string, ThemeNode[]>; onSelect: (name: string) => void }> = ({ groups, onSelect }) => (
  <div className="space-y-4">
    {[...groups.entries()].map(([cat, nodes]) => {
      const catInfo = nodes[0]?.categoryInfo;
      return (
        <div key={cat} className="rounded-xl p-4" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">{catInfo?.icon ?? "📂"}</span>
            <span className="text-sm font-bold" style={{ color: C.text }}>{cat}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ backgroundColor: (catInfo?.color ?? C.accent) + "20", color: catInfo?.color ?? C.accent }}>
              {nodes.length}个题材
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nodes.map((n) => (
              <button key={n.name} type="button" onClick={() => onSelect(n.name)}
                className="rounded-lg px-3 py-2 text-xs transition-all hover:scale-105"
                style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }}>
                <span className="font-medium">{n.name}</span>
                <span className="ml-2 font-bold" style={{ color: C.up }}>{n.limitUpCount}</span>
                <span className="ml-1 text-[10px]" style={{ color: C.dim }}>只涨停</span>
              </button>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

// ════════════════════════════════════════════════
//  Graph 视图：力导向图（简化版）
// ════════════════════════════════════════════════

interface Position { x: number; y: number; vx: number; vy: number }

const GraphView: FC<{
  nodes: ThemeNode[]; edges: ThemeEdge[];
  selected: string | null; onSelect: (name: string | null) => void;
}> = ({ nodes, edges, selected, onSelect }) => {
  return (
    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
      <div className="flex flex-wrap justify-center gap-3">
        {nodes.map((n) => {
          const isSel = selected === n.name;
          return (
            <button key={n.name} type="button" onClick={() => onSelect(isSel ? null : n.name)}
              className="rounded-xl px-4 py-3 text-sm transition-all hover:scale-105"
              style={{
                backgroundColor: isSel ? C.accent + "20" : C.bg,
                border: "1px solid " + (isSel ? C.accent : C.border),
                color: isSel ? C.accent : C.text,
              }}>
              <div className="font-bold">{n.name}</div>
              <div className="mt-1 text-[10px]" style={{ color: C.dim }}>
                {n.limitUpCount}只涨停 · {n.maxContinueNum}板
              </div>
              {n.dragonHead && (
                <div className="mt-1 text-[10px]" style={{ color: C.sub }}>
                  龙头: {n.dragonHead.name}({n.dragonHead.code})
                </div>
              )}
              <div className="mt-1">
                <span className="rounded px-1 py-0.5 text-[9px]"
                  style={{ backgroundColor: getStageColor(n.stage) + "18", color: getStageColor(n.stage) }}>
                  {n.stageLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {edges.length > 0 && (
        <div className="mt-6 text-[10px]" style={{ color: C.dim }}>
          关联: {edges.map((e) => e.source + "→" + e.target).join(" · ")}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
//  主页面
// ════════════════════════════════════════════════

const ThemeLibrary: FC = () => {
  const {
    loading, error,
    view, setView,
    search, setSearch,
    selectedTheme, selectTheme,
    kplNodes, conceptGroups, graphNodes, graphEdges,
    refresh,
  } = useThemeLibrary();

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

  return (
    <div className="flex flex-col gap-0 h-full" style={{ backgroundColor: C.bg }}>
      {/* 顶部栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid " + C.border }}>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold" style={{ color: C.text }}>题材库</h1>
          <span className="text-xs" style={{ color: C.dim }}>{kplNodes.length}个题材</span>
        </div>

        {/* 视图切换 */}
        <div className="flex rounded-lg p-0.5" style={{ backgroundColor: C.card, border: "1px solid " + C.border }}>
          {THEME_VIEWS.map((v) => (
            <button key={v.key} type="button" onClick={() => setView(v.key)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: view === v.key ? C.accent : "transparent",
                color: view === v.key ? C.bg : C.sub,
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* 搜索 + 刷新 */}
        <div className="flex items-center gap-2">
          <input type="text" value={search} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="搜索题材..."
            className="rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ backgroundColor: C.card, color: C.text, border: "1px solid " + C.border, width: 140 }} />
          <button type="button" onClick={refresh}
            className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5" style={{ color: C.dim }}>
            🔄
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-4">
        {view === "kpl" && <KPLView nodes={search ? kplNodes.filter((n) => n.name.includes(search)) : kplNodes} onSelect={selectTheme} selected={selectedTheme} />}
        {view === "concept" && <ConceptView groups={conceptGroups} onSelect={selectTheme} />}
        {view === "graph" && <GraphView nodes={graphNodes} edges={graphEdges} selected={selectedTheme} onSelect={selectTheme} />}
      </div>

      {/* 底部选中题材详情 */}
      {selectedTheme && (() => {
        const node = kplNodes.find((n) => n.name === selectedTheme);
        return (
          <div className="border-t px-4 py-2 flex flex-wrap items-center gap-4 text-xs" style={{ borderColor: C.border, backgroundColor: C.card }}>
            <span className="font-bold" style={{ color: C.accent }}>{selectedTheme}</span>
            {node && (
              <>
                {node.dragonHead ? (
                  <span style={{ color: C.sub }}>
                    龙头: <span style={{ color: C.text }}>{node.dragonHead.name}({node.dragonHead.code}) {node.dragonHead.continueNum}板</span>
                  </span>
                ) : (
                  <span style={{ color: C.dim }}>暂无龙头</span>
                )}
                <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: getStageColor(node.stage) + "18", color: getStageColor(node.stage) }}>{node.stageLabel}</span>
                <span style={{ color: C.sub }}>涨停: <span className="font-bold" style={{ color: C.up }}>{node.limitUpCount}只</span></span>
                <span style={{ color: C.sub }}>趋势: <span style={{ color: getTrendColor(node.change.trend) }}>{getTrendIcon(node.change.trend)}{node.change.count > 0 ? "+" : ""}{node.change.count}</span></span>
              </>
            )}
            <button type="button" onClick={() => selectTheme(null)} className="ml-auto rounded px-2 py-0.5 text-xs" style={{ color: C.dim, border: "1px solid " + C.border }}>关闭</button>
          </div>
        );
      })()}
    </div>
  );
};

export default ThemeLibrary;
