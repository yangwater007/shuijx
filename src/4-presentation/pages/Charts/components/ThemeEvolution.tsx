// ─── 子组件：右侧个股明细面板（成分股 + K线/分时） ──────

type PanelTab = "stocks" | "kline" | "timeshare";

interface StockDetailPanelProps {
  stocks: readonly EvoStock[];
  onClose: () => void;
}

/** 迷你K线 SVG */
const StockDetailPanel: FC<StockDetailPanelProps> = ({ stocks, onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>("stocks");
  const [selectedStock, setSelectedStock] = useState<EvoStock | null>(null);

  if (stocks.length === 0) return null;

  const panelTabs: { key: PanelTab; label: string }[] = [
    { key: "stocks", label: "成分股" },
    ...(selectedStock ? [
      { key: "kline" as PanelTab, label: "K线" },
      { key: "timeshare" as PanelTab, label: "分时" },
    ] : []),
  ];

  return (
    <div className="flex h-full flex-col">
      {/* 面板头部 */}
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#1e2a36" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">
            {selectedStock ? selectedStock.name : "成分股"}
          </span>
          {selectedStock && (
            <span className="text-xs text-slate-500">{selectedStock.code}</span>
          )}
          {!selectedStock && (
            <span className="text-xs text-slate-500">({stocks.length}只)</span>
          )}
        </div>
        <button type="button" onClick={onClose}
          className="text-lg text-slate-500 hover:text-slate-300 transition-colors">&times;</button>
      </div>

      {/* 子Tab */}
      <div className="flex border-b" style={{ borderColor: "#1e2a36" }}>
        {panelTabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className="border-b-2 px-3 py-2 text-xs font-medium transition-colors"
            style={{
              borderColor: activeTab === tab.key ? "#f6b26b" : "transparent",
              color: activeTab === tab.key ? "#f6b26b" : "#9aaec9",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        {/* 成分股列表 */}
        {activeTab === "stocks" && stocks.map((stock, idx) => {
          const isUp = stock.changeRate >= 0;
          return (
            <button
              key={stock.code}
              type="button"
              onClick={() => { setSelectedStock(stock); setActiveTab("kline"); }}
              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-white/5"
              style={{ borderColor: "#1e2a36" }}>
              <span className="w-5 text-center text-xs text-slate-500">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{stock.name}</span>
                  <span className="text-[10px] text-slate-600">{stock.code}</span>
                  <span className="rounded px-1.5 py-px text-[10px] font-medium"
                    style={{ backgroundColor: "rgba(246,178,107,0.15)", color: "#f6b26b" }}>
                    {stock.highDays}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{stock.industry}</span>
                  <span>·</span>
                  <span>{stock.limitUpType}</span>
                  <span>·</span>
                  <span className="text-slate-600">{stock.reasonType}</span>
                </div>
              </div>
              <span className="shrink-0 rounded px-2 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: isUp ? "#ef4444" : "#22c55e" }}>
                {isUp ? "+" : ""}{stock.changeRate.toFixed(2)}%
              </span>
              <span className="w-16 text-right text-sm" style={{ color: isUp ? "#ef4444" : "#22c55e" }}>
                {stock.latest.toFixed(2)}
              </span>
              <span className="w-20 text-right text-xs text-slate-400">
                {ThemeEvolutionService.formatAmount(stock.tradingAmount)}
              </span>
            </button>
          );
        })}

        {/* K线 Tab */}
        {activeTab === "kline" && selectedStock && (
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {selectedStock.name} — 日K线（近30日）
              </span>
              <button type="button" onClick={() => setSelectedStock(null)}
                className="text-xs text-slate-500 hover:text-slate-300">← 返回列表</button>
            </div>
            <div className="rounded-lg p-2" style={{ backgroundColor: "#0b0e14", height: 200 }}>
              {typeof window !== "undefined" ? (
                (() => {
                  const MiniKL: FC<{ code: string; height: number }> = (() => {
                    const { useState: us, useEffect: ue } = require("react");
                    const MiniComp: FC<{ code: string; height: number }> = ({ code: c, height: h }) => {
                      const [d, s] = us<Array<{ date: string; open: number; close: number; high: number; low: number }>>([]);
                      const [l, sl] = us(true);
                      ue(() => {
                        let cancelled = false;
                        (async () => {
                          const { fetchStockKLine } = await import("@data/repository/stockChart");
                          const r = await fetchStockKLine(c, 30);
                          if (!cancelled) { s(r); sl(false); }
                        })();
                        return () => { cancelled = true; };
                      }, [c]);
                      if (l) return <div className="flex items-center justify-center" style={{ height: h }}><span className="text-xs text-slate-600">加载中…</span></div>;
                      if (!d.length) return <div className="flex items-center justify-center" style={{ height: h }}><span className="text-xs text-slate-600">无数据</span></div>;
                      const maxH = Math.max(...d.map((p) => p.high));
                      const minL = Math.min(...d.map((p) => p.low));
                      const rng = maxH - minL || 1;
                      const cw2 = 248; const ch2 = h - 16;
                      const cw3 = Math.max(1.2, cw2 / d.length * 0.6);
                      return React.createElement("svg", { viewBox: `0 0 280 ${h}`, className: "w-full" },
                        ...d.map((p, i) => {
                          const x = 28 + (i / Math.max(d.length - 1, 1)) * 248 - cw3 / 2;
                          const up = p.close >= p.open;
                          const clr = up ? "#ef4444" : "#22c55e";
                          const yH = 4 + ch2 - ((p.high - minL) / rng) * ch2;
                          const yL = 4 + ch2 - ((p.low - minL) / rng) * ch2;
                          const yO = 4 + ch2 - ((p.open - minL) / rng) * ch2;
                          const yC = 4 + ch2 - ((p.close - minL) / rng) * ch2;
                          const bt = Math.min(yO, yC);
                          const bh = Math.max(Math.abs(yC - yO), 0.5);
                          return React.createElement("g", { key: p.date },
                            React.createElement("line", { x1: x + cw3 / 2, y1: yH, x2: x + cw3 / 2, y2: yL, stroke: clr, strokeWidth: "0.6" }),
                            React.createElement("rect", { x, y: bt, width: cw3, height: bh, fill: up ? clr : "transparent", stroke: clr, strokeWidth: "0.6" })
                          );
                        })
                      );
                    };
                    return MiniComp;
                  })();
                  return null; // fallback to simple loading
                })()
              ) : null}
            </div>
            {/* 简易内联K线 */}
            <MiniKLineInline code={selectedStock.code} />
          </div>
        )}

        {/* 分时 Tab */}
        {activeTab === "timeshare" && selectedStock && (
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {selectedStock.name} — 分时走势
              </span>
              <button type="button" onClick={() => setSelectedStock(null)}
                className="text-xs text-slate-500 hover:text-slate-300">← 返回列表</button>
            </div>
            <MiniTimeshareInline code={selectedStock.code} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 内联迷你图表组件（避免循环依赖） ──────────────

const MiniKLineInline: FC<{ code: string }> = ({ code }) => {
  const [data, setData] = useState<Array<{ date: string; open: number; close: number; high: number; low: number; volume?: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { fetchStockKLine } = await import("@data/repository/stockChart");
        const result = await fetchStockKLine(code, 30);
        if (!cancelled) { setData(result); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (loading) return <div className="flex items-center justify-center py-10"><span className="text-xs text-slate-600">加载K线数据...</span></div>;
  if (!data.length) return <div className="flex items-center justify-center py-10"><span className="text-xs text-slate-600">暂无K线数据</span></div>;

  const maxH = Math.max(...data.map((d) => d.high));
  const minL = Math.min(...data.map((d) => d.low));
  const rng = maxH - minL || 1;
  const H = 200; const pad = { t: 4, r: 4, b: 20, l: 42 };
  const cw = 240; const ch = H - pad.t - pad.b;
  const candleW = Math.max(1.5, cw / data.length * 0.6);

  return (
    <div className="rounded-lg" style={{ backgroundColor: "#0b0e14", padding: 8 }}>
      <svg viewBox={`0 0 300 ${H}`} className="w-full">
        {[0, 0.33, 0.67, 1].map((frac) => {
          const y = pad.t + ch * (1 - frac);
          const price = minL + frac * rng;
          return (
            <g key={`g${frac}`}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#1e2a36" strokeWidth="0.5" />
              <text x={pad.l - 4} y={y + 3} fill="#9aaec9" fontSize="9" textAnchor="end">{price.toFixed(2)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = pad.l + (i / Math.max(data.length - 1, 1)) * cw - candleW / 2;
          const isUp = d.close >= d.open;
          const color = isUp ? "#ef4444" : "#22c55e";
          const yHigh = pad.t + ch - ((d.high - minL) / rng) * ch;
          const yLow = pad.t + ch - ((d.low - minL) / rng) * ch;
          const yOpen = pad.t + ch - ((d.open - minL) / rng) * ch;
          const yClose = pad.t + ch - ((d.close - minL) / rng) * ch;
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(Math.abs(yClose - yOpen), 0.5);
          return (
            <g key={d.date}>
              <line x1={x + candleW / 2} y1={yHigh} x2={x + candleW / 2} y2={yLow} stroke={color} strokeWidth="0.7" />
              <rect x={x} y={bodyTop} width={candleW} height={bodyH} fill={isUp ? color : "transparent"} stroke={color} strokeWidth="0.7" rx={isUp ? 0.5 : 0} />
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const idx = Math.floor(frac * (data.length - 1));
          const x = pad.l + frac * cw;
          const raw = data[idx]!.date;
          const label = raw.length >= 8 ? `${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
          return <text key={`dx${frac}`} x={x} y={H - 4} fill="#4a6a8a" fontSize="8" textAnchor="middle">{label}</text>;
        })}
      </svg>
    </div>
  );
};

const MiniTimeshareInline: FC<{ code: string }> = ({ code }) => {
  const [data, setData] = useState<Array<{ time: string; price: number }>>([]);
  const [preClose, setPreClose] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { fetchStockTimeshare } = await import("@data/repository/stockChart");
        const result = await fetchStockTimeshare(code);
        if (!cancelled) { setData(result.data); setPreClose(result.preClose); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (loading) return <div className="flex items-center justify-center py-10"><span className="text-xs text-slate-600">加载分时数据...</span></div>;
  if (!data.length) return <div className="flex items-center justify-center py-10"><span className="text-xs text-slate-600">暂无分时数据</span></div>;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices) * 0.998;
  const maxP = Math.max(...prices) * 1.002;
  const rng = maxP - minP || 1;
  const H = 200; const pad = { t: 4, r: 4, b: 20, l: 42 };
  const cw = 240; const ch = H - pad.t - pad.b;
  const isUp = data[data.length - 1]!.price >= (preClose || data[0]!.price);
  const color = isUp ? "#ef4444" : "#22c55e";

  const pathD = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length - 1, 1)) * cw;
    const y = pad.t + ch - ((d.price - minP) / rng) * ch;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="rounded-lg" style={{ backgroundColor: "#0b0e14", padding: 8 }}>
      <svg viewBox={`0 0 300 ${H}`} className="w-full">
        {[0, 0.33, 0.67, 1].map((frac) => {
          const y = pad.t + ch * (1 - frac);
          const price = minP + frac * rng;
          return (
            <g key={`g${frac}`}>
              <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#1e2a36" strokeWidth="0.5" />
              <text x={pad.l - 4} y={y + 3} fill="#9aaec9" fontSize="9" textAnchor="end">{price.toFixed(2)}</text>
            </g>
          );
        })}
        {preClose > 0 && (() => {
          const y = pad.t + ch - ((preClose - minP) / rng) * ch;
          return <line x1={pad.l} y1={y} x2={pad.l + cw} y2={y} stroke="#4a6a8a" strokeWidth="0.5" strokeDasharray="3,2" />;
        })()}
        <defs>
          <linearGradient id={`tsf_${code}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L${pad.l + cw},${pad.t + ch} L${pad.l},${pad.t + ch} Z`} fill={`url(#tsf_${code})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1" />
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const idx = Math.floor(frac * (data.length - 1));
          const x = pad.l + frac * cw;
          return <text key={`tx${frac}`} x={x} y={H - 4} fill="#4a6a8a" fontSize="8" textAnchor="middle">{data[idx]!.time.slice(-5)}</text>;
        })}
      </svg>
    </div>
  );
};
// ─── 子组件：顶部筛选栏 ───────────────────────────

const TopFilterBar: FC = () => (
  <div className="mb-3 flex items-center justify-between rounded-lg px-4 py-2.5"
    style={{ backgroundColor: "#131a24", border: "1px solid #1e2a36" }}>
    {/* 左侧：品牌 */}
    <div className="flex items-center gap-2">
      <span className="text-base font-bold" style={{ background: "linear-gradient(135deg, #f6b26b, #e88d3f)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        连板天梯
      </span>
    </div>
    {/* 中间：筛选标签 */}
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1 rounded px-3 py-1 text-xs"
        style={{ backgroundColor: "#0b0e14", color: "#9aaec9", border: "1px solid #1e2a36" }}>
        <i className="fas fa-calendar-alt" />{FILTER_INFO.date}
      </span>
      <span className="flex items-center gap-1 rounded px-3 py-1 text-xs"
        style={{ backgroundColor: "rgba(246,178,107,0.1)", color: "#f6b26b", border: "1px solid rgba(246,178,107,0.3)" }}>
        <i className="fas fa-clock" />{FILTER_INFO.fermentDays}
      </span>
      <span className="flex items-center gap-1 rounded px-3 py-1 text-xs"
        style={{ backgroundColor: "#0b0e14", color: "#9aaec9", border: "1px solid #1e2a36" }}>
        <i className="fas fa-coins" />{FILTER_INFO.fundFlow}
      </span>
      <button type="button" className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:text-slate-300"
        style={{ border: "1px solid #1e2a36" }}>
        <i className="fas fa-sync-alt" />刷新
      </button>
    </div>
    {/* 右侧 */}
    <div className="flex items-center gap-3">
      <button type="button" className="rounded-lg px-3 py-1 text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, #f6b26b, #e88d3f)" }}
        onClick={() => window.alert("跳转至升级会员页面")}>
        升级会员
      </button>
      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: "#f6b26b" }}>李</div>
    </div>
  </div>
);

// ─── 子组件：升级Pro卡片 ───────────────────────────

const UpgradeProCard: FC = () => (
  <div className="absolute bottom-4 right-4 rounded-lg p-3" style={{
    backgroundColor: "rgba(11,14,20,0.85)", backdropFilter: "blur(12px)",
    border: "1px solid rgba(246,178,107,0.3)",
    width: 220,
  }}>
    <div className="mb-1 text-xs font-bold text-orange-400">升级Pro会员</div>
    <div className="mb-2 text-[10px] leading-relaxed text-slate-500">
      可查看实时数据和最近3个交易日的完整数据
    </div>
    <button type="button"
      className="w-full rounded-md py-1 text-xs font-bold text-white"
      style={{ background: "linear-gradient(135deg, #f6b26b, #e88d3f)" }}
      onClick={() => window.alert("跳转至升级会员页面")}>
      立即升级
    </button>
  </div>
);

// ─── 主组件 ─────────────────────────────────────

type ViewMode = "path" | "sankey";

const ThemeEvolution: FC = () => {
  const {
    data, loading, error,
    selectedNode, activePaths, selectedStocks,
    selectById, clearSelection, refresh,
  } = useThemeEvolution();

  const [viewMode, setViewMode] = useState<ViewMode>("path");

  // 个股面板是否展开
  const stockPanelOpen = selectedStocks.length > 0;

  const handleThemeSelect = useCallback(
    (themeId: string, childType: EvoChildType) => {
      if (selectedNode?.themeId === themeId && selectedNode?.childType === childType) {
        clearSelection();
        return;
      }
      selectById(themeId, childType);
    },
    [selectedNode, selectById, clearSelection]
  );

  // 加载态
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <span className="text-sm text-slate-500">加载题材演化数据...</span>
        </div>
      </div>
    );
  }

  // 错误态
  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg p-6 text-center" style={{
          backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
        }}>
          <p className="text-sm text-red-400">加载失败：{error}</p>
          <button type="button" onClick={refresh}
            className="mt-3 text-xs text-orange-400 underline">点击重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0" style={{ color: "#e8edf5" }}>
      <TopFilterBar />

      {/* 主内容：左侧树 + 中间图表 + 右侧个股面板 */}
      <div className="flex gap-0 overflow-hidden rounded-xl"
        style={{ backgroundColor: "#131a24", border: "1px solid #1e2a36", minHeight: 500 }}>

        {/* 左侧题材树 */}
        <div className="w-[220px] shrink-0 border-r" style={{ borderColor: "#1e2a36" }}>
          <ThemeTree
            nodes={data.nodes}
            selectedThemeId={selectedNode?.themeId ?? null}
            selectedChildType={selectedNode?.childType ?? null}
            onSelect={handleThemeSelect}
          />
        </div>

        {/* 中间图表区 */}
        <div className="relative flex-1 p-4" style={stockPanelOpen ? { maxWidth: "calc(100% - 540px)" } : {}}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {viewMode === "path" ? "题材发酵路径图" : "题材发酵路径桑基图"}
              </span>
              <span className="text-[10px] text-slate-600">
                {viewMode === "path" ? "桑基图" : "路径图"}
                <span className="ml-1">→</span>
              </span>
            </div>

            {/* Tab 切换 */}
            <div className="flex rounded-lg p-0.5"
              style={{ backgroundColor: "#0b0e14", border: "1px solid #1e2a36" }}>
              {(["path", "sankey"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)}
                  className="rounded-md px-4 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: viewMode === mode ? "#f6b26b" : "transparent",
                    color: viewMode === mode ? "#0b0e14" : "#9aaec9",
                  }}>
                  {mode === "path" ? "路径图" : "桑基图"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative overflow-x-auto pb-4">
            <SankeyFlow activePaths={activePaths} viewMode={viewMode} />
          </div>

          <UpgradeProCard />
        </div>

        {/* 右侧个股明细面板 */}
        {stockPanelOpen && (
          <div className="w-[320px] shrink-0 border-l" style={{ borderColor: "#1e2a36" }}>
            <StockDetailPanel
              stocks={selectedStocks}
              onClose={clearSelection}
            />
          </div>
        )}
      </div>

      {/* 底部导航栏 */}
      <div className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5 text-xs"
        style={{ backgroundColor: "#131a24", border: "1px solid #1e2a36" }}>
        <div className="flex items-center gap-5">
          {["涨停趋势", "涨停矩阵", "涨停强度", "资金流向", "题材演化"].map((label) => (
            <span key={label} className="cursor-pointer transition-colors"
              style={{ color: label === "题材演化" ? "#f6b26b" : "#4a6a8a" }}>
              {label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-orange-400"
            style={{ backgroundColor: "rgba(246,178,107,0.15)" }}>Pro</span>
          <span style={{ color: "#4a6a8a" }}>© 2026 连板天梯</span>
        </div>
      </div>
    </div>
  );
};

export default ThemeEvolution;



