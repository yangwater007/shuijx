/**
 * StockQuadrant — 选中板块的个股象限分布
 * 右侧面板：显示板块下钻个股列表（按涨幅排序，前40只）
 * 每行点击弹出 StockDetailModal，显示K线/分时/题材
 */

import { useState, type FC } from "react";
import type { StockQuadrantResponse, StockQuadrantItem } from "@data/dto/sector";
import { getQuadrantLabel, getQuadrantColor, formatSectorAmount, formatSectorMv } from "@service/sector/SectorService";
import StockDetailModal from "@ui/components/business/StockDetailModal";

interface Props {
  data: StockQuadrantResponse | null;
  loading: boolean;
}

function changeColor(v: number): string {
  if (v > 0) return "var(--stock-up)";
  if (v < 0) return "var(--stock-down)";
  return "var(--stock-flat)";
}

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return sign + v.toFixed(2) + "%";
}

const StockQuadrant: FC<Props> = ({ data, loading }) => {
  const [selectedStock, setSelectedStock] = useState<StockQuadrantItem | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
          加载个股数据...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <span className="text-2xl opacity-30">📋</span>
        <span className="text-sm text-slate-600">点击左侧板块查看个股分布</span>
      </div>
    );
  }

  const allStocks = [
    ...data.quadrants.highStrong.map((s) => ({ ...s, quadKey: "highStrong" as const })),
    ...data.quadrants.highWeak.map((s) => ({ ...s, quadKey: "highWeak" as const })),
    ...data.quadrants.lowStrong.map((s) => ({ ...s, quadKey: "lowStrong" as const })),
    ...data.quadrants.lowWeak.map((s) => ({ ...s, quadKey: "lowWeak" as const })),
  ];
  const sorted = [...allStocks].sort((a, b) => b.recentChange - a.recentChange);
  const topStocks = sorted.slice(0, 40);

  if (topStocks.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        {data.sectorName} — 暂无成分股数据
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--board-border)" }}>
              <th className="px-2 py-2 text-left text-slate-500 font-medium">股票</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">近N日</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">今日</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">成交额</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">流通市值</th>
              <th className="px-2 py-2 text-right text-slate-500 font-medium">排名</th>
              <th className="px-2 py-2 text-center text-slate-500 font-medium">象限</th>
            </tr>
          </thead>
          <tbody>
            {topStocks.map((stock) => (
              <tr
                key={stock.code}
                onClick={() => setSelectedStock(stock)}
                className="cursor-pointer transition-colors hover:bg-white/[0.06]"
                style={{ borderBottom: "1px solid var(--board-border)" }}
                title="点击查看详情"
              >
                <td className="px-2 py-1.5 text-left">
                  <span className="font-medium text-slate-200">{stock.name}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-slate-600">{stock.code}</span>
                </td>
                <td className="px-2 py-1.5 text-right font-mono" style={{ color: changeColor(stock.recentChange) }}>
                  {formatPct(stock.recentChange)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono" style={{ color: changeColor(stock.todayChange) }}>
                  {formatPct(stock.todayChange)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                  {formatSectorAmount(stock.amount)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                  {formatSectorMv(stock.circMv)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-slate-500">
                  {stock.positionPctRank}
                </td>
                <td className="px-1.5 py-1.5 text-center">
                  <span
                    className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: getQuadrantColor(stock.quadKey) + "18",
                      color: getQuadrantColor(stock.quadKey),
                    }}>
                    {getQuadrantLabel(stock.quadKey)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StockDetailModal
        visible={selectedStock !== null}
        stock={selectedStock ? {
          code: selectedStock.code,
          name: selectedStock.name,
          price: selectedStock.close,
          changeRate: selectedStock.todayChange,
          industry: selectedStock.industry,
        } : null}
        onClose={() => setSelectedStock(null)}
      />
    </>
  );
};

export default StockQuadrant;
