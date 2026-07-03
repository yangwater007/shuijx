/**
 * StockDetailModal — 个股详情弹窗（通用组件）
 * 三Tab：分时图 + K线(含MA+成交量副图) + 题材概念
 * 可被连板天梯、板块轮动、题材演化等任何模块调用
 * 数据源：同花顺 (10jqka.com.cn) → 东方财富 fallback
 */

import { useState, useEffect, useCallback, type FC, type MouseEvent } from "react";
import { useStockChart } from "@business/stock/useStockChart";

// ─── 通用个股接口（最小契约） ────────────────────

export interface StockBrief {
  code: string;
  name: string;
  price?: number;
  changeRate?: number;
  highDays?: string;
  limitUpType?: string;
  industry?: string;
}

interface Props {
  visible: boolean;
  stock: StockBrief | null;
  onClose: () => void;
}

type TabKey = "timeshare" | "kline" | "concept";

const TABS: { key: TabKey; label: string }[] = [
  { key: "timeshare", label: "分时图" },
  { key: "kline", label: "K线" },
  { key: "concept", label: "题材" },
];

// ─── 颜色常量 ─────────────────────────────

const CLR = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  grid: "#1e2a36",
  text: "#e8edf5",
  textSub: "#9aaec9",
  textDim: "#4a6a8a",
  up: "#ef4444",
  down: "#22c55e",
  ma5: "rgba(200,210,220,0.55)",
  ma10: "rgba(250,200,80,0.6)",
  ma20: "rgba(168,130,230,0.6)",
  limitup: "#ef4444",
};

// ─── 骨架屏 ──────────────────────────────────

const ChartSkeleton: FC<{ height: number }> = ({ height }) => (
  <div className="flex animate-pulse items-center justify-center rounded-xl"
    style={{ height, backgroundColor: "var(--board-card)" }}>
    <div className="flex flex-col items-center gap-3">
      <div className="h-2 w-24 rounded" style={{ backgroundColor: "var(--board-border)" }} />
      <div className="h-2 w-32 rounded" style={{ backgroundColor: "var(--board-border)" }} />
    </div>
  </div>
);

const EmptyState: FC<{ text: string; height: number }> = ({ text, height }) => (
  <div className="flex items-center justify-center rounded-xl border-2 border-dashed"
    style={{ height, borderColor: "var(--board-border)", backgroundColor: "var(--board-card)" }}>
    <p className="text-sm text-slate-500">{text}</p>
  </div>
);

// ─── 计算简单移动均线 ───────────────────────

function calcSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j]!;
    result.push(sum / period);
  }
  return result;
}

// ─── 格式化金额 ─────────────────────────────

function fmtVol(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}万`;
  return String(n);
}

// ════════════════════════════════════════════════
//  分时图 Tab（含成交量副图）
// ════════════════════════════════════════════════


/** 检查当前是否在A股交易时段 */
function isTradingHours(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (minutes >= 570 && minutes <= 690) || (minutes >= 780 && minutes <= 900);
}

/** 根据股票代码判断涨跌幅限制 */
function getLimitPct(code: string): number {
  if (code.startsWith("30") || code.startsWith("68")) return 0.20;
  if (code.startsWith("4") || code.startsWith("8")) return 0.30;
  return 0.10;
}
const TimeshareTab: FC<{ code: string; preClose: number }> = ({ code, preClose: fallbackPreClose }) => {
  const { timeshareData, preClose: tsPreClose, tsLoading, refresh } = useStockChart(code);

  // 交易时段每30秒自动刷新
  useEffect(() => {
    if (!isTradingHours()) return;
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const effectivePreClose = tsPreClose > 0 ? tsPreClose : fallbackPreClose;

  if (tsLoading && timeshareData.length === 0) return <ChartSkeleton height={400} />;
  if (timeshareData.length === 0) return <EmptyState text="暂无分时数据（非交易时段）" height={400} />;

  const data = timeshareData;
  const volumes = data.map((d) => d.volume ?? 0);
    const limitPct = getLimitPct(code);
  const minPrice = effectivePreClose * (1 - limitPct);
  const maxPrice = effectivePreClose * (1 + limitPct);
  const priceRange = maxPrice - minPrice || 1;
  const lineColor = "#a855f7";

  // 成交量范围
  const maxVol = Math.max(...volumes, 1);
  const volRange = maxVol || 1;

  // 布局参数
  const W = 680;
  const TOTAL_H = 380;
  const MAIN_RATIO = 0.72;
  const PAD = { top: 29, right: 12, bottom: 24, left: 60, mid: 6 };
  const mainH = Math.floor(TOTAL_H * MAIN_RATIO) - PAD.top - PAD.mid;
  const volH = TOTAL_H - Math.floor(TOTAL_H * MAIN_RATIO) - PAD.mid - PAD.bottom;
  const chartW = W - PAD.left - PAD.right;

  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const toPriceY = (p: number) => PAD.top + mainH - ((p - minPrice) / priceRange) * mainH;

  // 分时折线
  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toPriceY(d.price).toFixed(1)}`).join(" ");
  // 均价线
  const avgPathD = data.map((d, i) => {
    const avg = d.avgPrice ?? d.price;
    return `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toPriceY(avg).toFixed(1)}`;
  }).join(" ");
  const preCloseY = toPriceY(effectivePreClose);

  // 成交量柱
  const barW = Math.max(1, chartW / data.length * 0.7);

  // hover 数据
  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold" style={{ color: CLR.text }}>分时走势 <span className="text-[10px]" style={{ color: CLR.textDim }}>({(getLimitPct(code) * 100).toFixed(0)}%涨跌幅)</span></h3>
          <span className="text-xs" style={{ color: CLR.textDim }}>{data.length}个数据点</span>
          {hovered && (
            <span className="text-xs font-mono" style={{ color: CLR.textSub }}>
              {hovered.time}  |  {hovered.price.toFixed(2)}
              <span style={{ color: hovered.price >= effectivePreClose ? CLR.up : CLR.down }}>
                {" "}{((hovered.price - effectivePreClose) / effectivePreClose * 100).toFixed(2)}%
              </span>
              {" "}| 量{fmtVol(hovered.volume ?? 0)}
            </span>
          )}
        </div>
        {/* 图例 */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: lineColor }} />分时</span>
          <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: "#a855f7" }} />均价</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: CLR.bg }}
        onMouseLeave={() => setHoverIdx(null)}>
        <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full cursor-crosshair">
          {/* ── 价格网格 ── */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = PAD.top + mainH * (1 - frac);
            const price = minPrice + frac * priceRange;
            return (
              <g key={`g${frac}`}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={CLR.grid} strokeWidth="0.5" />
                <text x={PAD.left - 4} y={y + 4} fill={CLR.textSub} fontSize="10" textAnchor="end">{price.toFixed(2)}</text>
              </g>
            );
          })}

          {/* ── 昨收虚线 ── */}
          <line x1={PAD.left} y1={preCloseY} x2={W - PAD.right} y2={preCloseY} stroke={CLR.textDim} strokeWidth="0.8" strokeDasharray="4,3" />
          <text x={W - PAD.right - 6} y={preCloseY - 5} fill={CLR.textDim} fontSize="9" textAnchor="end">昨收 {effectivePreClose.toFixed(2)}</text>

          {/* ── 渐变填充 ── */}
          <defs>
            <linearGradient id="tsFillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={`${pathD} L${toX(data.length - 1).toFixed(1)},${PAD.top + mainH} L${toX(0).toFixed(1)},${PAD.top + mainH} Z`} fill="url(#tsFillGrad)" />

          {/* ── 均价线 ── */}
          <path d={avgPathD} fill="none" stroke="#a855f7" strokeWidth="0.9" strokeDasharray="4,3" opacity="0.7" />

          {/* ── 分时主线 ── */}
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.3" />

          {/* ── Hover 竖线 ── */}
          {hoverIdx !== null && (
            <line x1={toX(hoverIdx)} y1={PAD.top} x2={toX(hoverIdx)} y2={PAD.top + mainH} stroke={CLR.textSub} strokeWidth="0.6" strokeDasharray="3,2" opacity="0.5" />
          )}

          {/* ── 成交量分隔线 ── */}
          <line x1={PAD.left} y1={PAD.top + mainH + PAD.mid} x2={W - PAD.right} y2={PAD.top + mainH + PAD.mid} stroke={CLR.grid} strokeWidth="0.8" />
          <text x={PAD.left - 4} y={PAD.top + mainH + PAD.mid + volH / 2 + 1} fill={CLR.textDim} fontSize="8" textAnchor="end">量</text>

          {/* ── 成交量柱 ── */}
          {volumes.map((v, i) => {
            if (v === 0) return null;
            const x = toX(i) - barW / 2;
            const h = (v / volRange) * volH;
            const barY = PAD.top + mainH + PAD.mid * 2 + volH - h;
            const barColor = data[i]!.price >= (data[i]!.avgPrice ?? data[i]!.price) ? CLR.up : CLR.down;
            const isHovered = hoverIdx === i;
            return (
              <g key={`v${i}`}>
                <rect x={x} y={barY} width={barW} height={Math.max(h, 0.5)}
                  fill={barColor} opacity={isHovered ? 1 : 0.45}
                  stroke={isHovered ? barColor : "none"} strokeWidth="0.3" />
                {isHovered && (
                  <text x={toX(i)} y={barY - 3} fill={CLR.text} fontSize="9" textAnchor="middle">{fmtVol(v)}</text>
                )}
              </g>
            );
          })}

          {/* ── Hover 透明度覆盖层 ── */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={mainH + PAD.mid + volH + PAD.mid}
            fill="transparent"
            onMouseMove={(e) => {
              const svg = (e.target as SVGElement).closest("svg");
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const scaleX = W / rect.width;
              const svgX = mx * scaleX;
              const idx = Math.round(((svgX - PAD.left) / chartW) * (data.length - 1));
              setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
            }} />

          {/* ── 时间轴 ── */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const idx = Math.floor(frac * (data.length - 1));
            const x = PAD.left + frac * chartW;
            return <text key={`t${frac}`} x={x} y={TOTAL_H - 6} fill={CLR.textDim} fontSize="9" textAnchor="middle">{data[idx]!.time.slice(-5)}</text>;
          })}
        </svg>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════
//  K线 Tab（主图 + 成交量副图）
// ════════════════════════════════════════════════

const KLineTab: FC<{ code: string; preClose?: number }> = ({ code, preClose: fallbackPreClose }) => {
  const { klineData, klineLoading, refresh: klRefresh } = useStockChart(code);

  // 交易时段每30秒自动刷新
  useEffect(() => {
    if (!isTradingHours()) return;
    const timer = setInterval(klRefresh, 30000);
    return () => clearInterval(timer);
  }, [klRefresh]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (klineLoading && klineData.length === 0) return <ChartSkeleton height={480} />;
  if (klineData.length === 0) return <EmptyState text="暂无K线数据" height={480} />;

  const data = klineData.slice(-80); // 最近80根
  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);
  const volumes = data.map((d) => d.volume ?? 0);

  // 均线
  const ma5 = calcSMA(closes, 5);
  const ma10 = calcSMA(closes, 10);
  const ma20 = calcSMA(closes, 20);

  // 价格范围（含均线）
  const allMAs = [...ma5, ...ma10, ...ma20].filter((v): v is number => v !== null);
  const maxP = Math.max(...highs, ...allMAs);
  const minP = Math.min(...lows, ...allMAs);
  const pRange = maxP - minP || 1;

  // 昨收（用倒数第二根的close做参考）
  const preCloseVal = fallbackPreClose ?? (data.length >= 2 ? data[data.length - 2]!.close : data[0]!.close);
  const limitUpPrice = preCloseVal * 1.1; // 主板涨停价

  // 成交量范围
  const maxVol = Math.max(...volumes, 1);

  // 布局参数：主图:副图 ≈ 4:1
  const W = 680;
  const TOTAL_H = 480;
  const MAIN_RATIO = 0.78;
  const PAD = { top: 32, right: 32, bottom: 28, left: 62, mid: 10 };
  const mainH = Math.floor(TOTAL_H * MAIN_RATIO) - PAD.top - PAD.mid;
  const volH = TOTAL_H - Math.floor(TOTAL_H * MAIN_RATIO) - PAD.mid - PAD.bottom;
  const chartW = W - PAD.left - PAD.right;

  const toX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const toPriceY = (p: number) => PAD.top + mainH - ((p - minP) / pRange) * mainH;

  // 蜡烛宽度
  const candleW = Math.max(2, (chartW / data.length) * 0.65);
  const barW = Math.max(1.2, (chartW / data.length) * 0.65);

  // hover 数据
  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  // 均线路径生成
  const maPath = (ma: (number | null)[], dash: string) => {
    let d = "";
    let started = false;
    for (let i = 0; i < ma.length; i++) {
      if (ma[i] === null) { started = false; continue; }
      const x = toX(i);
      const y = toPriceY(ma[i]!);
      d += `${started ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
      started = true;
    }
    return (
      <path d={d} fill="none" strokeDasharray={dash} strokeWidth="1" opacity="0.85" />
    );
  };

  return (
    <div>
      {/* 头部 */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold" style={{ color: CLR.text }}>日K线（近{data.length}日）</h3>
          {hovered && (
            <span className="text-xs font-mono" style={{ color: CLR.textSub }}>
              {hovered.date} | 开{hovered.open.toFixed(2)} 高{hovered.high.toFixed(2)} 低{hovered.low.toFixed(2)} 收{hovered.close.toFixed(2)}
              <span style={{ color: hovered.close >= hovered.open ? CLR.up : CLR.down }}>
                {" "}{((hovered.close - hovered.open) / hovered.open * 100).toFixed(2)}%
              </span>
              {" "}| 量{fmtVol(hovered.volume ?? 0)}
            </span>
          )}
        </div>
        {/* 图例 */}
        <div className="flex items-center gap-2.5 text-[10px]">
          {[
            { l: "MA5", c: CLR.ma5 }, { l: "MA10", c: CLR.ma10 }, { l: "MA20", c: CLR.ma20 },
          ].map((m) => (
            <span key={m.l} className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: m.c }} />
              {m.l}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: CLR.bg }}
        onMouseLeave={() => setHoverIdx(null)}>
        <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full cursor-crosshair">
          {/* ═══ 主图：价格网格 ═══ */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((frac) => {
            const y = PAD.top + mainH * (1 - frac);
            const price = minP + frac * pRange;
            return (
              <g key={`pg${frac}`}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke={CLR.grid} strokeWidth="0.5" />
                <text x={PAD.left - 4} y={y + 4} fill={CLR.textSub} fontSize="10" textAnchor="end">{price.toFixed(2)}</text>
              </g>
            );
          })}

          {/* ═══ 均线 ═══ */}
          {maPath(ma5, "none")}
          {maPath(ma10, "none")}
          {maPath(ma20, "none")}

          {/* ═══ 涨停价虚线 ═══ */}
          {limitUpPrice <= maxP && limitUpPrice >= minP && (
            <>
              <line x1={PAD.left} y1={toPriceY(limitUpPrice)} x2={W - PAD.right} y2={toPriceY(limitUpPrice)}
                stroke={CLR.limitup} strokeWidth="0.8" strokeDasharray="5,3" opacity="0.5" />
              <text x={W - PAD.right - 2} y={toPriceY(limitUpPrice) - 4} fill={CLR.limitup} fontSize="9" textAnchor="end" opacity="0.7">
                涨停 {limitUpPrice.toFixed(2)}
              </text>
            </>
          )}

          {/* ═══ K线蜡烛 ═══ */}
          {data.map((d, i) => {
            const x = toX(i) - candleW / 2;
            const isUp = d.close >= d.open;
            const color = isUp ? CLR.up : CLR.down;
            const yHigh = toPriceY(d.high);
            const yLow = toPriceY(d.low);
            const yOpen = toPriceY(d.open);
            const yClose = toPriceY(d.close);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyH = Math.max(Math.abs(yClose - yOpen), 1);
            const isHovered = hoverIdx === i;

            return (
              <g key={`kl${i}`} opacity={isHovered ? 1 : (hoverIdx !== null ? 0.45 : 1)}>
                {/* 影线 */}
                <line x1={x + candleW / 2} y1={yHigh} x2={x + candleW / 2} y2={yLow}
                  stroke={color} strokeWidth="0.8" />
                {/* 实体 */}
                <rect x={x} y={bodyTop} width={candleW} height={bodyH}
                  fill={color} stroke={color} strokeWidth="0.9" opacity={isUp ? 1 : 0.85}
                  rx={isUp ? 1 : 0} />
                {isHovered && (
                  <rect x={x - 1} y={yHigh - 2} width={candleW + 2} height={yLow - yHigh + 4}
                    fill="none" stroke={CLR.textSub} strokeWidth="1" strokeDasharray="2,1" rx="1" />
                )}
              </g>
            );
          })}

          {/* ═══ Hover 竖线 ═══ */}
          {hoverIdx !== null && (
            <line x1={toX(hoverIdx)} y1={PAD.top} x2={toX(hoverIdx)} y2={PAD.top + mainH}
              stroke={CLR.textSub} strokeWidth="0.6" strokeDasharray="3,2" opacity="0.4" />
          )}

          {/* ═══ 成交量分隔线 ═══ */}
          <line x1={PAD.left} y1={PAD.top + mainH + PAD.mid} x2={W - PAD.right} y2={PAD.top + mainH + PAD.mid}
            stroke={CLR.grid} strokeWidth="0.8" />
          <text x={PAD.left - 4} y={PAD.top + mainH + PAD.mid + volH / 2 + 1} fill={CLR.textDim} fontSize="8" textAnchor="end">量</text>

          {/* ═══ 成交量柱 ═══ */}
          {volumes.map((v, i) => {
            if (v === 0) return null;
            const x = toX(i) - barW / 2;
            const h = (v / maxVol) * volH;
            const barY = PAD.top + mainH + PAD.mid * 2 + volH - h;
            const color = data[i]!.close >= data[i]!.open ? CLR.up : CLR.down;
            const isHovered = hoverIdx === i;
            return (
              <g key={`vk${i}`}>
                <rect x={x} y={barY} width={barW} height={Math.max(h, 0.5)}
                  fill={color} opacity={isHovered ? 1 : 0.5} rx="0.5" />
                {isHovered && (
                  <text x={toX(i)} y={barY - 3} fill={CLR.text} fontSize="9" textAnchor="middle">{fmtVol(v)}</text>
                )}
              </g>
            );
          })}

          {/* ═══ Hover 透明捕获层 ═══ */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={mainH + PAD.mid + volH + PAD.mid}
            fill="transparent"
            onMouseMove={(e) => {
              const svg = (e.target as SVGElement).closest("svg");
              if (!svg) return;
              const rect = svg.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const scaleX = W / rect.width;
              const svgX = mx * scaleX;
              const idx = Math.round(((svgX - PAD.left) / chartW) * (data.length - 1));
              setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
            }} />

          {/* ═══ 日期轴 ═══ */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((frac) => {
            const idx = Math.floor(frac * (data.length - 1));
            const x = PAD.left + frac * chartW;
            const raw = data[idx]!.date;
            const label = raw.length >= 8 ? `${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
            return <text key={`dx${frac}`} x={x} y={TOTAL_H - 6} fill={CLR.textDim} fontSize="9" textAnchor="middle">{label}</text>;
          })}
        </svg>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════
//  题材 Tab
// ════════════════════════════════════════════════

const ConceptTab: FC<{ stock: StockBrief }> = ({ stock }) => {
  const { conceptInfo, conceptLoading } = useStockChart(stock.code);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
        <h3 className="border-b px-4 py-3 text-sm font-bold text-slate-300" style={{ borderColor: "var(--board-border)" }}>
          股票信息
        </h3>
        <div className="grid grid-cols-2 gap-2 p-4">
          {[
            { label: "股票代码", value: stock.code },
            { label: "股票名称", value: stock.name },
            ...(stock.price !== undefined ? [{ label: "最新价", value: stock.price.toFixed(2) }] : []),
            ...(stock.changeRate !== undefined ? [{ label: "涨跌幅", value: `${stock.changeRate >= 0 ? "+" : ""}${stock.changeRate.toFixed(2)}%`, color: stock.changeRate >= 0 ? "var(--stock-up)" : "var(--stock-down)" }] : []),
            ...(stock.highDays ? [{ label: "连板状态", value: stock.highDays }] : []),
            ...(stock.limitUpType ? [{ label: "涨停类型", value: stock.limitUpType }] : []),
            ...(stock.industry ? [{ label: "所属行业", value: stock.industry }] : []),
          ].map((item) => (
            <div key={item.label} className="flex justify-between rounded-lg p-2.5" style={{ backgroundColor: "var(--board-bg)" }}>
              <span className="text-xs text-slate-500">{item.label}</span>
              <span className="text-xs font-medium" style={{ color: (item as { color?: string }).color ?? "#e2e8f0" }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {conceptLoading && (
        <div className="flex items-center gap-2 rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
          <div className="h-3 w-3 animate-spin rounded-full border border-orange-400 border-t-transparent" />
          <span className="text-xs text-slate-500">加载题材数据...</span>
        </div>
      )}

      {!conceptLoading && conceptInfo && (
        <>
          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
            <h3 className="border-b px-4 py-3 text-sm font-bold text-slate-300" style={{ borderColor: "var(--board-border)" }}>
              涨停原因
            </h3>
            <div className="p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
                {conceptInfo.reasonType || "暂无数据"}
              </p>
            </div>
          </div>
          {conceptInfo.reasonInfo && (
            <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
              <h3 className="border-b px-4 py-3 text-sm font-bold text-slate-300" style={{ borderColor: "var(--board-border)" }}>
                详细分析
              </h3>
              <div className="p-4">
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-400">
                  {conceptInfo.reasonInfo}
                </p>
              </div>
            </div>
          )}
          {conceptInfo.analysis && (
            <div className="overflow-hidden rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
              <h3 className="border-b px-4 py-3 text-sm font-bold text-slate-300" style={{ borderColor: "var(--board-border)" }}>
                题材分析
              </h3>
              <div className="p-4">
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
                  {conceptInfo.analysis}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!conceptLoading && !conceptInfo && (
        <div className="rounded-xl py-10 text-center" style={{ backgroundColor: "var(--board-card)" }}>
          <span className="text-sm text-slate-500">暂无题材数据（该股票可能不在当前涨停列表中）</span>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════
//  主弹窗组件
// ════════════════════════════════════════════════

const StockDetailModal: FC<Props> = ({ visible, stock, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("timeshare");

  useEffect(() => {
    if (visible) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) { window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }
  }, [visible, handleKeyDown]);

  if (!visible || !stock) return null;

  const isUp = (stock.changeRate ?? 0) >= 0;
  const changeColor = isUp ? "var(--stock-up)" : "var(--stock-down)";
  const preClose = stock.price && stock.changeRate !== undefined
    ? stock.price / (1 + stock.changeRate / 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={onClose}>
      <div className="mx-2 flex max-h-[94vh] w-full max-w-[840px] flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: "var(--board-bg)" }}
        onClick={(e: MouseEvent) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-start justify-between border-b px-6 py-4" style={{ borderColor: "var(--board-border)" }}>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{stock.name}</h2>
              <span className="font-mono text-sm text-slate-500">{stock.code}</span>
            </div>
            {(stock.price !== undefined || stock.changeRate !== undefined) && (
              <div className="mt-1 flex items-center gap-3 text-sm">
                {stock.price !== undefined && (
                  <span className="font-mono text-lg font-bold" style={{ color: changeColor }}>{stock.price.toFixed(2)}</span>
                )}
                {stock.changeRate !== undefined && (
                  <span className="font-mono font-bold" style={{ color: changeColor }}>
                    {isUp ? "+" : ""}{stock.changeRate.toFixed(2)}%
                  </span>
                )}
                {(stock.highDays || stock.limitUpType) && (
                  <span className="text-xs text-slate-500">{[stock.highDays, stock.limitUpType].filter(Boolean).join(" · ")}</span>
                )}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white" title="关闭 (ESC)">✕</button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b px-6" style={{ borderColor: "var(--board-border)" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
                style={{ borderColor: isActive ? "var(--stock-up)" : "transparent", color: isActive ? "#fff" : "var(--stock-flat)" }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "timeshare" && <TimeshareTab code={stock.code} preClose={preClose} />}
          {activeTab === "kline" && <KLineTab code={stock.code} preClose={preClose} />}
          {activeTab === "concept" && <ConceptTab stock={stock} />}
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;
