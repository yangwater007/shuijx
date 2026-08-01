/**
 * 板块资金流向 — 100% 复刻 quicktiny /sector-capital-flow
 * 模块：桑基图 + 柱状排行 + 折线趋势 + 数据表格
 * 数据源: stock.quicktiny.cn/api/sector-capital-flow/*
 */
import { useState, useEffect, useMemo, type FC } from "react";
import { fetchSectorCapitalFlowSnapshot, fetchSectorTimeline } from "@data/repository/sectorCapitalFlow";
import type { SectorCapitalFlowRow, SectorCapitalFlowTimelinePoint } from "@data/dto/sectorCapitalFlow";
import SectorFlowSankey from "./SectorFlowSankey";
import SectorBarRank from "./SectorBarRank";
import SectorTimelineChart from "./SectorTimelineChart";

const C = {
  bg: "#0b0e14", card: "#131a24", border: "#1e2a36",
  up: "#ef4444", down: "#22c55e", flat: "#6b7280",
  text: "#e8edf5", sub: "#9aaec9", dim: "#4a6a8a",
  accent: "#f6b26b", accent2: "#3b82f6",
};

type SortKey = keyof SectorCapitalFlowRow;

const COLUMNS: { key: SortKey; label: string; align: "left" | "right"; fmt: (v: number) => string; colorKey?: SortKey }[] = [
  { key: "sectorName", label: "板块", align: "left", fmt: (v) => String(v) },
  { key: "mainNetAmount", label: "主力净流入", align: "right", fmt: fmtYi, colorKey: "mainNetAmount" },
  { key: "bigOrderNetAmount", label: "大单净流入", align: "right", fmt: fmtYi, colorKey: "bigOrderNetAmount" },
  { key: "pctChg", label: "涨跌幅", align: "right", fmt: fmtPct, colorKey: "pctChg" },
  { key: "strength", label: "强度", align: "right", fmt: (v) => String(v) },
  { key: "relativeInflow", label: "相对流入", align: "right", fmt: (v) => v.toFixed(2) },
  { key: "floatMarketCap", label: "流通市值", align: "right", fmt: fmtYi },
  { key: "memberCount", label: "成分股", align: "right", fmt: (v) => String(v) },
];

function fmtYi(n: number): string {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(0) + "万";
  return String(n);
}
function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

type ViewMode = "overview" | "detail";

const SectorCapitalFlowPage: FC = () => {
  const [rows, setRows] = useState<SectorCapitalFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState({ tradeDate: "", total: 0, time: "" });
  const [sortKey, setSortKey] = useState<SortKey>("mainNetAmount");
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");
  const [mode, setMode] = useState<ViewMode>("overview");

  // Timeline data
  const [timelineData, setTimelineData] = useState<SectorCapitalFlowTimelinePoint[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchSectorCapitalFlowSnapshot();
        const snapshot = res.data;
        setRows(snapshot.rows);
        setInfo({
          tradeDate: snapshot.tradeDate,
          total: snapshot.total,
          time: snapshot.snapshotTime
            ? new Date(snapshot.snapshotTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
            : "",
        });

        // Load timeline for top sectors
        setTimelineLoading(true);
        try {
          const topSectors = snapshot.rows.slice(0, 5);
          const timelineResults = await Promise.allSettled(
            topSectors.map((r) => fetchSectorTimeline(r.sectorCode))
          );
          const allPoints: SectorCapitalFlowTimelinePoint[] = [];
          for (const r of timelineResults) {
            if (r.status === "fulfilled" && r.value.success) {
              allPoints.push(...r.value.data.points);
            }
          }
          setTimelineData(allPoints);
        } catch { /* timeline optional */ }
        setTimelineLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const kw = filter.toLowerCase();
    return rows.filter((r) => r.sectorName.toLowerCase().includes(kw) || r.sectorCode.includes(kw));
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const s = [...filtered].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return typeof va === "string" ? String(va).localeCompare(String(vb)) : (va as number) - (vb as number);
    });
    return sortDesc ? s.reverse() : s;
  }, [filtered, sortKey, sortDesc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(true); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ backgroundColor: C.bg }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.border, borderTopColor: C.accent2 }} />
        <span style={{ color: C.sub, fontSize: 13 }}>加载板块资金数据...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: C.bg }}>
        <span style={{ color: C.up }}>加载失败: {error}</span>
      </div>
    );
  }

  const dateStr = info.tradeDate
    ? info.tradeDate.slice(0, 4) + "-" + info.tradeDate.slice(4, 6) + "-" + info.tradeDate.slice(6, 8)
    : "";

  return (
    <div className="flex flex-col gap-4 pb-8" style={{ backgroundColor: C.bg, minHeight: "100%" }}>
      {/* === 顶部信息栏 === */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div>
          <h1 className="text-lg font-bold" style={{ color: C.text }}>板块资金流向</h1>
          <p className="text-xs mt-0.5" style={{ color: C.dim }}>
            数据来源 stock.quicktiny.cn · {dateStr} · {info.time} · {info.total} 个板块
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid " + C.border }}>
            {(["overview", "detail"] as ViewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: mode === m ? C.accent2 : C.card,
                  color: mode === m ? "#fff" : C.sub,
                }}
              >
                {m === "overview" ? "总览" : "明细"}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="搜索板块..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded px-3 py-1.5 text-xs outline-none w-36"
            style={{ backgroundColor: C.card, color: C.text, border: "1px solid " + C.border }}
          />
        </div>
      </div>

      {/* === 总览模式：图表 === */}
      {mode === "overview" && (
        <>
          {/* 桑基图 */}
          <SectorFlowSankey sectorRows={rows} />

          {/* 柱状图 + 时序图 并排 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectorBarRank rows={rows} title="板块资金排行 Top 15" topN={15} height={380} />
            <SectorTimelineChart
              title="资金趋势 (Top 5 板块)"
              data={timelineData}
              height={380}
              loading={timelineLoading}
            />
          </div>

          {/* 第二行：涨跌幅排行 */}
          <SectorBarRank rows={rows} title="板块涨跌幅排行" topN={15} height={380} />
        </>
      )}

      {/* === 明细模式：表格 === */}
      {mode === "detail" && (
        <div className="overflow-auto rounded-xl" style={{ backgroundColor: C.card }}>
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr style={{ backgroundColor: C.card }}>
                <th className="py-2 px-3 text-left" style={{ color: C.dim, width: 36, borderBottom: "1px solid " + C.border }}>#</th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={"py-2 px-2 cursor-pointer hover:text-white transition-colors select-none text-" + col.align}
                    style={{ color: sortKey === col.key ? C.accent : C.dim, borderBottom: "1px solid " + C.border }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1" style={{ color: C.accent }}>{sortDesc ? "↓" : "↑"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.sectorCode}
                  className="hover:brightness-125 transition-all"
                  style={{ backgroundColor: i % 2 === 0 ? C.bg : C.card }}
                >
                  <td className="py-1.5 px-3" style={{ color: C.dim, borderBottom: "1px solid " + C.border }}>{i + 1}</td>
                  {COLUMNS.map((col) => {
                    const val = row[col.key] ?? 0;
                    const display = col.fmt(val as number);
                    const colorKey = col.colorKey;
                    let color = C.sub;
                    if (colorKey) {
                      const v = (row[colorKey] as number) ?? 0;
                      if (v > 0) color = C.up;
                      else if (v < 0) color = C.down;
                    }
                    return (
                      <td
                        key={col.key}
                        className={"py-1.5 px-2 font-mono text-" + col.align}
                        style={{ color, borderBottom: "1px solid " + C.border }}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-1.5 text-[10px]" style={{ borderTop: "1px solid " + C.border, color: C.dim }}>
            共 {sorted.length} 个板块 · 点击列头排序
          </div>
        </div>
      )}
    </div>
  );
};

export default SectorCapitalFlowPage;
