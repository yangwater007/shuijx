/** 表现层 — 题材库页面（kpl小表格 / concept分类 / graph挖掘 三视图） */

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

// ─── KPL 视图：小表格 ──────────────────────────

const KPLView: FC<{ nodes: ThemeNode[]; onSelect: (name: string) => void; selected: string | null }> = ({ nodes, onSelect, selected }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
          {["题材", "涨停", "最高板", "龙头股", "阶段", "变化"].map((h) => (
            <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: C.dim }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {nodes.map((n) => (
          <tr key={n.name} onClick={() => onSelect(n.name)}
            className="cursor-pointer transition-colors hover:bg-white/5"
            style={{ backgroundColor: selected === n.name ? `${C.accent}10` : "transparent", borderBottom: `1px solid ${C.border}` }}>
            <td className="px-3 py-2.5 font-medium" style={{ color: C.text }}>{n.name}</td>
            <td className="px-3 py-2.5 font-bold" style={{ color: C.up }}>{n.limitUpCount}</td>
            <td className="px-3 py-2.5" style={{ color: C.accent }}>{n.maxContinueNum}板</td>
            <td className="px-3 py-2.5" style={{ color: C.text }}>{n.dragonHead?.name ?? '—'}<span className="ml-1" style={{ color: C.dim }}>{n.dragonHead.code}</span></td>
            <td className="px-3 py-2.5"><span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${getStageColor(n.stage)}18`, color: getStageColor(n.stage) }}>{n.stageLabel}</span></td>
            <td className="px-3 py-2.5 font-bold" style={{ color: getTrendColor(n.change.trend) }}>{getTrendIcon(n.change.trend)}{n.change.count > 0 ? "+" : ""}{n.change.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Concept 视图：分类卡片 ──────────────────────

const ConceptView: FC<{ groups: Map<string, ThemeNode[]>; onSelect: (name: string) => void }> = ({ groups, onSelect }) => (
  <div className="space-y-4">
    {[...groups.entries()].map(([cat, nodes]) => {
      const catInfo = nodes[0]?.categoryInfo;
      return (
        <div key={cat} className="rounded-xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">{catInfo?.icon ?? "📌"}</span>
            <span className="text-sm font-bold" style={{ color: C.text }}>{cat}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: `${catInfo?.color ?? C.accent}20`, color: catInfo?.color ?? C.accent }}>{nodes.length}个题材</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {nodes.map((n) => (
              <button key={n.name} type="button" onClick={() => onSelect(n.name)}
                className="rounded-lg px-3 py-2 text-xs transition-all hover:scale-105"
                style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}>
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

// ─── Graph 视图：力导向图 ────────────────────────

interface Position { x: number; y: number; vx: number; vy: number }

const GraphView: FC<{
  nodes: ThemeNode[]; edges: ThemeEdge[];
  selected: string | null; onSelect: (name: string | null) => void;
}> = ({ nodes, edges, selected, onSelect }) => {
  const W = 800, H = 550;

  // 简单力导向布局（仅计算位置，不做物理模拟）
  const layout = useSimpleLayout(nodes, selected);

  // 构建选中主题的关联子图
  const displayEdges = selected
    ? edges.filter((e) => e.source === selected || e.target === selected)
    : edges.filter((e) => {
        const s = nodes.find((n) => n.name === e.source);
        const t = nodes.find((n) => n.name === e.target);
        return s && t && (s.limitUpCount >= 3 || t.limitUpCount >= 3);
      });

  // 高亮相关节点
  const relatedNodes = selected
    ? new Set([selected, ...displayEdges.flatMap((e) => [e.source, e.target])])
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 500 }}>
      {/* 边 */}
      {displayEdges.map((e, i) => {
        const sp = layout.get(e.source);
        const tp = layout.get(e.target);
        if (!sp || !tp) return null;
        const isRelated = selected && (e.source === selected || e.target === selected);
        return (
          <line key={i} x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y}
            stroke={isRelated ? C.accent : C.dim} strokeOpacity={isRelated ? 0.4 : 0.08} strokeWidth={isRelated ? 1.5 : 0.5} />
        );
      })}

      {/* 节点 */}
      {nodes.map((n) => {
        const pos = layout.get(n.name);
        if (!pos) return null;
        const isSel = selected === n.name;
        const isRelated = relatedNodes?.has(n.name) ?? true;
        const r = Math.max(14, Math.min(32, 10 + n.limitUpCount * 2));
        const opacity = relatedNodes && !isRelated ? 0.2 : 1;

        return (
          <g key={n.name} onClick={() => onSelect(isSel ? null : n.name)}
            className="cursor-pointer transition-opacity" style={{ opacity }}>
            <circle cx={pos.x} cy={pos.y} r={r}
              fill={isSel ? C.accent : getStageColor(n.stage)}
              stroke={isSel ? C.accent : "transparent"} strokeWidth={isSel ? 3 : 0}
              fillOpacity={isSel ? 0.9 : 0.7} />
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" fill="#fff" fontSize={Math.max(8, r * 0.5)} fontWeight="bold">
              {n.limitUpCount}
            </text>
            <text x={pos.x} y={pos.y + r + 13} textAnchor="middle" fill={isSel ? C.accent : C.sub} fontSize={isSel ? 11 : 9} fontWeight={isSel ? "bold" : "normal"}>
              {n.name.length > 5 ? n.name.slice(0, 5) + ".." : n.name}
            </text>
            {isSel && (
              <text x={pos.x} y={pos.y + r + 26} textAnchor="middle" fill={C.dim} fontSize={9}>
                龙头: {n.dragonHead?.name ?? '—'} | {n.stageLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

/** 简易圆形力导向布局 */
function useSimpleLayout(nodes: ThemeNode[], _selected: string | null): Map<string, Position> {
  const [positions] = useState<Map<string, Position>>(() => {
    const map = new Map<string, Position>();
    const cx = 400, cy = 275, radius = 220;
    // 按分类分组排列
    const cats = [...new Set(nodes.map((n) => n.category))];

    nodes.forEach((n, i) => {
      // 同一分类的节点聚集
      const catIdx = cats.indexOf(n.category);
      const baseAngle = (catIdx / cats.length) * 2 * Math.PI;
      const spread = nodes.filter((x) => x.category === n.category).length;
      const withinCatIdx = nodes.filter((x, j) => x.category === n.category && j <= i).length - 1;
      const angle = baseAngle + (withinCatIdx / Math.max(spread, 1)) * (Math.PI / 4);
      const r = radius * (0.5 + 0.5 * (withinCatIdx / Math.max(spread, 1)));

      map.set(n.name, {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0, vy: 0,
      });
    });
    return map;
  });

  return positions;
}

// ─── 主页面 ────────────────────────────────────

const ThemeLibrary: FC = () => {
  const {
    loading, error,
    view, setView,
    search, setSearch,
    selectedTheme, selectTheme,
    kplNodes, conceptGroups, graphNodes, graphEdges,
    refresh,
  } = useThemeLibrary();

  // 加载态
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

  // 错误态
  if (error) {
    return (
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: C.bg }}>
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <p className="mb-3" style={{ color: C.up }}>加载失败: {error}</p>
          <button type="button" onClick={refresh} className="rounded-lg px-4 py-2 text-sm font-bold" style={{ backgroundColor: C.accent, color: C.bg }}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 h-full" style={{ backgroundColor: C.bg }}>
      {/* 顶部栏 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold" style={{ color: C.text }}>题材库</h1>
          <span className="text-xs" style={{ color: C.dim }}>{kplNodes.length}个题材</span>
        </div>

        {/* 视图切换 */}
        <div className="flex rounded-lg p-0.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
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
            style={{ backgroundColor: C.card, color: C.text, border: `1px solid ${C.border}`, width: 160 }} />
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

      {/* 选中主题详情 */}
      {selectedTheme && (
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs" style={{ borderColor: C.border, backgroundColor: C.card }}>
          <span className="font-bold" style={{ color: C.accent }}>{selectedTheme}</span>
          {(() => {
            const node = kplNodes.find((n) => n.name === selectedTheme);
            if (!node) return null;
            return (
              <>
                <span style={{ color: C.sub }}>龙头: <span style={{ color: C.text }}>{node?.dragonHead.name}({node?.dragonHead.code}) {node?.dragonHead.continueNum}板</span></span>
                <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: `${getStageColor(node.stage)}18`, color: getStageColor(node.stage) }}>{node.stageLabel}</span>
                <span style={{ color: C.sub }}>涨停: <span className="font-bold" style={{ color: C.up }}>{node.limitUpCount}只</span></span>
                <span style={{ color: C.sub }}>趋势: <span style={{ color: getTrendColor(node.change.trend) }}>{getTrendIcon(node.change.trend)}{node.change.count > 0 ? "+" : ""}{node.change.count}</span></span>
              </>
            );
          })()}
          <button type="button" onClick={() => selectTheme(null)} className="ml-auto rounded px-2 py-0.5 text-xs" style={{ color: C.dim, border: `1px solid ${C.border}` }}>关闭</button>
        </div>
      )}
    </div>
  );
};

export default ThemeLibrary;