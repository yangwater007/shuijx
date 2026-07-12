/**
 * DragonTigerBoard — 龙虎榜页面
 * 展示个股资金流向+涨停信息，按净流入排序
 */
import { type FC } from "react";
import PageHeader from "@ui/components/PageHeader";
import useDragonTiger from "@business/visualization/useDragonTiger";
import { STOCK_UP, STOCK_DOWN, STOCK_FLAT } from "@infra/config";

function fmtYi(val: number): string {
  if (!val || Math.abs(val) < 1) return "—";
  const yi = val / 1e8;
  return `${yi > 0 ? "+" : ""}${yi.toFixed(2)}亿`;
}

function fmtWan(val: number): string {
  if (!val) return "—";
  const yi = val / 1e8;
  if (Math.abs(yi) >= 1) return `${yi.toFixed(2)}亿`;
  const wan = val / 1e4;
  return `${wan.toFixed(0)}万`;
}

const DragonTigerBoard: FC = () => {
  const { stocks, totalInflowCount, totalOutflowCount, totalNetInflow, totalNetOutflow, loading, error, refresh } = useDragonTiger();

  if (error) {
    return (
      <div>
        <PageHeader title="龙虎榜" subtitle="个股资金流向+涨停信息" />
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <span className="text-4xl">⚠️</span>
          <p>{error}</p>
          <button type="button" onClick={refresh}
            className="rounded-lg px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="龙虎榜" subtitle="个股资金流向排名 · 东财实时数据" />

      {/* 汇总卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl p-4 flex flex-col items-center" style={{ backgroundColor: "var(--board-card)" }}>
          <span className="text-[11px] text-slate-400 mb-1">净流入股票</span>
          <span className="text-xl font-bold" style={{ color: STOCK_UP }}>{totalInflowCount}<span className="text-sm font-normal text-slate-500"> 只</span></span>
        </div>
        <div className="rounded-xl p-4 flex flex-col items-center" style={{ backgroundColor: "var(--board-card)" }}>
          <span className="text-[11px] text-slate-400 mb-1">净流出股票</span>
          <span className="text-xl font-bold" style={{ color: STOCK_DOWN }}>{totalOutflowCount}<span className="text-sm font-normal text-slate-500"> 只</span></span>
        </div>
        <div className="rounded-xl p-4 flex flex-col items-center" style={{ backgroundColor: "var(--board-card)" }}>
          <span className="text-[11px] text-slate-400 mb-1">净流入总额</span>
          <span className="text-xl font-bold" style={{ color: STOCK_UP }}>{fmtYi(totalNetInflow)}</span>
        </div>
        <div className="rounded-xl p-4 flex flex-col items-center" style={{ backgroundColor: "var(--board-card)" }}>
          <span className="text-[11px] text-slate-400 mb-1">净流出总额</span>
          <span className="text-xl font-bold" style={{ color: STOCK_DOWN }}>{fmtYi(totalNetOutflow)}</span>
        </div>
      </div>

      {/* 刷新 */}
      <div className="flex justify-end mb-3">
        <button type="button" onClick={refresh}
          className="text-[11px] text-slate-500 hover:text-white px-3 py-1 rounded border border-slate-700 hover:border-slate-500"
          disabled={loading}>
          {loading ? "刷新中..." : "🔄 刷新"}
        </button>
      </div>

      {/* 股票列表 */}
      {loading && stocks.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <div className="animate-spin w-5 h-5 border-2 border-slate-600 border-t-red-500 rounded-full mr-2" />
          加载中...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: "var(--board-card)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b" style={{ borderColor: "var(--board-border)" }}>
                <th className="text-left py-3 px-4 w-8">#</th>
                <th className="text-left py-3 px-4">股票</th>
                <th className="text-right py-3 px-3">涨跌幅</th>
                <th className="text-right py-3 px-3">主力净流入</th>
                <th className="text-right py-3 px-3 hidden md:table-cell">超大单</th>
                <th className="text-right py-3 px-3 hidden md:table-cell">大单</th>
                <th className="text-right py-3 px-3 hidden lg:table-cell">中单</th>
                <th className="text-right py-3 px-3 hidden lg:table-cell">小单</th>
                <th className="text-right py-3 px-3">成交额</th>
                <th className="text-left py-3 px-3 hidden xl:table-cell">涨停原因</th>
                <th className="text-center py-3 px-3">连板</th>
              </tr>
            </thead>
            <tbody>
              {stocks.slice(0, 100).map((s, i) => (
                <tr key={s.code} className="border-b transition-colors hover:bg-white/5"
                  style={{ borderColor: "var(--board-border)" }}>
                  <td className="py-3 px-4 text-slate-600">{i + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 rounded-full"
                        style={{ backgroundColor: s.flowType === "inflow" ? STOCK_UP : STOCK_DOWN }} />
                      <div>
                        <div className="text-sm font-bold text-white">{s.name}</div>
                        <div className="text-[10px] text-slate-500">{s.code}</div>
                      </div>
                      {s.continueNum > 0 && (
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400">
                          {s.continueNum}板
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold"
                    style={{ color: s.changePercent >= 0 ? STOCK_UP : STOCK_DOWN }}>
                    {s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold"
                    style={{ color: s.mainNetInflow >= 0 ? STOCK_UP : STOCK_DOWN }}>
                    {fmtYi(s.mainNetInflow)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300 hidden md:table-cell">{fmtYi(s.superLargeInflow)}</td>
                  <td className="py-3 px-3 text-right text-slate-300 hidden md:table-cell">{fmtYi(s.largeInflow)}</td>
                  <td className="py-3 px-3 text-right text-slate-300 hidden lg:table-cell">{fmtYi(s.mediumInflow)}</td>
                  <td className="py-3 px-3 text-right text-slate-300 hidden lg:table-cell">{fmtYi(s.smallInflow)}</td>
                  <td className="py-3 px-3 text-right text-slate-300">{fmtWan(s.amount)}</td>
                  <td className="py-3 px-3 text-slate-400 max-w-[120px] truncate hidden xl:table-cell"
                    title={s.reasonType}>
                    {s.reasonType || "—"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.continueNum > 0 ? (
                      <span className="text-red-400 font-bold">{s.continueNum}板</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stocks.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-500">暂无数据</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DragonTigerBoard;
