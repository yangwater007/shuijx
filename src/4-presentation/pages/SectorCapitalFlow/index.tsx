/**
 * 板块资金流向 — 100% 复刻 quicktiny 数据+样式
 * 数据源: stock.quicktiny.cn/api/sector-capital-flow/snapshot
 */
import { useState, useEffect, useMemo, type FC } from "react";
import { fetchSectorCapitalFlowSnapshot } from "@data/repository/sectorCapitalFlow";
import type { SectorCapitalFlowRow } from "@data/dto/sectorCapitalFlow";

// ── 样式常量（与 quicktiny 暗色主题一致）──
const C = {
  bg: "#0b0e14", card: "#131a24", border: "#1e2a36",
  up: "#ef4444", down: "#22c55e", flat: "#6b7280",
  text: "#e8edf5", sub: "#9aaec9", dim: "#4a6a8a",
  accent: "#f6b26b", accent2: "#3b82f6",
};

// ── 列定义 ──
type SortKey = keyof SectorCapitalFlowRow;
interface ColDef {
  key: SortKey;
  label: string;
  align: "left" | "right";
  fmt: (v: number) => string;
  colorKey?: SortKey;
  width?: number;
}

const COLUMNS: ColDef[] = [
  { key: "sectorName", label: "板块", align: "left", fmt: (v) => String(v), width: 130 },
  { key: "mainNetAmount", label: "主力净流入", align: "right", fmt: fmtYi, colorKey: "mainNetAmount", width: 100 },
  { key: "bigOrderNetAmount", label: "大单净流入", align: "right", fmt: fmtYi, colorKey: "bigOrderNetAmount", width: 100 },
  { key: "pctChg", label: "涨跌幅", align: "right", fmt: fmtPct, colorKey: "pctChg", width: 80 },
  { key: "strength", label: "强度", align: "right", fmt: (v) => String(v), width: 70 },
  { key: "relativeInflow", label: "相对流入", align: "right", fmt: (v) => v.toFixed(2), width: 80 },
  { key: "changeFromOpen", label: "开盘变化", align: "right", fmt: fmtYi, colorKey: "changeFromOpen", width: 100 },
  { key: "mainBuyAmount", label: "主力买入", align: "right", fmt: fmtYi, width: 100 },
  { key: "mainSellAmount", label: "主力卖出", align: "right", fmt: fmtYi, width: 100 },
  { key: "floatMarketCap", label: "流通市值", align: "right", fmt: fmtYi, width: 100 },
  { key: "memberCount", label: "成分股", align: "right", fmt: (v) => String(v), width: 60 },
];

function fmtYi(n: number): string {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(0) + "万";
  return String(n);
}
function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

// ── 组件 ──
const SectorCapitalFlowPage: FC = () => {
  const [rows, setRows] = useState<SectorCapitalFlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState({ tradeDate: "", total: 0, time: "" });
  const [sortKey, setSortKey] = useState<SortKey>("mainNetAmount");
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");

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
          time: snapshot.snapshotTime ? new Date(snapshot.snapshotTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
        });
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

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: C.bg }}>
      {/* ── 顶栏 ── */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{ borderBottom: "1px solid " + C.border, backgroundColor: C.card }}>
        <div>
          <h1 className="text-base font-bold" style={{ color: C.text }}>板块资金流向</h1>
          <p className="text-xs mt-0.5" style={{ color: C.dim }}>
            数据来源 stock.quicktiny.cn · {info.tradeDate.slice(0, 4)}-{info.tradeDate.slice(4, 6)}-{info.tradeDate.slice(6, 8)} · {info.time} 更新 · {info.total} 个板块
          </p>
        </div>
        <input
          type="text"
          placeholder="搜索板块..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded px-3 py-1.5 text-xs outline-none w-40"
          style={{ backgroundColor: C.bg, color: C.text, border: "1px solid " + C.border }}
        />
      </div>

      {/* ── 表格 ── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr style={{ backgroundColor: C.card }}>
              <th className="py-2 px-3 text-left" style={{ color: C.dim, width: 36, borderBottom: "1px solid " + C.border }}>#</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={"py-2 px-2 cursor-pointer hover:text-white transition-colors select-none " + (col.align === "right" ? "text-right" : "text-left")}
                  style={{
                    color: sortKey === col.key ? C.accent : C.dim,
                    width: col.width,
                    borderBottom: "1px solid " + C.border,
                  }}
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
            {sorted.map((row, i) => {
              const bgRow = i % 2 === 0 ? C.bg : C.card;
              return (
                <tr
                  key={row.sectorCode}
                  className="hover:brightness-125 transition-all duration-75"
                  style={{ backgroundColor: bgRow }}
                >
                  <td className="py-1.5 px-3" style={{ color: C.dim, borderBottom: "1px solid " + C.border }}>{i + 1}</td>
                  {COLUMNS.map((col) => {
                    const val = row[col.key] ?? 0;
                    const display = col.fmt(val as number);
                    const colorKey = col.colorKey;
                    let color = C.sub;
                    if (colorKey) {
                      const v = row[colorKey] as number ?? 0;
                      if (v > 0) color = C.up;
                      else if (v < 0) color = C.down;
                    }
                    return (
                      <td
                        key={col.key}
                        className={"py-1.5 px-2 font-mono " + (col.align === "right" ? "text-right" : "text-left")}
                        style={{ color, borderBottom: "1px solid " + C.border, whiteSpace: "nowrap" }}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 底栏 ── */}
      <div className="flex-shrink-0 px-4 py-1.5 flex items-center justify-between text-[10px]"
        style={{ borderTop: "1px solid " + C.border, color: C.dim }}>
        <span>共 {sorted.length} 个板块</span>
        <span>↑↓ 点击列头排序</span>
      </div>
    </div>
  );
};

export default SectorCapitalFlowPage;
