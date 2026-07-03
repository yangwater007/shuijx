/**
 * BoardListView — 列表视图：14列表格 + 连板层级分组 + 迷你图
 * 深度还原 quicktiny 原网页布局
 */

import { useMemo, type FC, type ReactNode } from "react";
import type { BoardLevel, BoardStock } from "@data/models/board.model";
import { formatAmount } from "@infra/utils/format";
import MiniKLine from "../MiniChart/MiniKLine";
import MiniTimeshare from "../MiniChart/MiniTimeshare";
import {
  mockAuctionChange,
  formatLimitTime,
  mockPeakLimit,
  mockMainNet,
  mockMainNetDirection,
  mockAmplitude,
  formatTurnover,
} from "../../hooks/listViewMock";

interface Props {
  levels: BoardLevel[];
  loading: boolean;
  selectedTheme: string | null;
  onStockClick?: (stock: BoardStock) => void;
}

// ─── 层级颜色 ───
function getLevelColor(level: number): string {
  if (level >= 7) return "linear-gradient(135deg, #dc2626, #ef4444)";
  if (level >= 5) return "linear-gradient(135deg, #ef4444, #f97316)";
  if (level >= 3) return "linear-gradient(135deg, #f97316, #fb923c)";
  return "linear-gradient(135deg, #fb923c, #fbbf24)";
}

// ─── 题材标签颜色映射 ───
const THEME_TAG_COLORS: Record<string, string> = {
  "芯片": "#3b82f6",
  "半导体": "#3b82f6",
  "人工智能": "#3b82f6",
  "AI": "#3b82f6",
  "通信": "#3b82f6",
  "5G": "#3b82f6",
  "新能源": "#22c55e",
  "光伏": "#22c55e",
  "储能": "#22c55e",
  "锂电池": "#22c55e",
  "医药": "#8b5cf6",
  "消费": "#f59e0b",
  "金融": "#f59e0b",
};

function getThemeColor(theme: string): string {
  return THEME_TAG_COLORS[theme] ?? "#6b7280";
}

// ─── 表格列头 ───
const COLUMNS = [
  { key: "stock", label: "股票", width: 180, align: "left" as const },
  { key: "kline", label: "K线", width: 100, align: "center" as const },
  { key: "timeshare", label: "分时", width: 100, align: "center" as const },
  { key: "changePct", label: "涨跌幅", width: 72, align: "center" as const },
  { key: "price", label: "最新价", width: 60, align: "center" as const },
  { key: "board", label: "连板", width: 50, align: "center" as const },
  { key: "auction", label: "竞价", width: 60, align: "center" as const },
  { key: "limitTime", label: "涨停时间", width: 62, align: "center" as const },
  { key: "limitAmount", label: "封单额", width: 72, align: "center" as const },
  { key: "amount", label: "成交额", width: 72, align: "center" as const },
  { key: "peakLimit", label: "峰封", width: 52, align: "center" as const },
  { key: "mainNet", label: "主净", width: 60, align: "center" as const },
  { key: "turnover", label: "卖换", width: 52, align: "center" as const },
  { key: "amplitude", label: "日内", width: 60, align: "center" as const },
] as const;

// ─── 通用单元格 ───
const Td: FC<{ width: number; align: "left" | "center"; children: ReactNode; muted?: boolean }> = ({
  width,
  align,
  children,
  muted,
}) => (
  <td
    className="py-2 text-xs"
    style={{
      width,
      minWidth: width,
      textAlign: align,
      color: muted ? "var(--stock-flat)" : undefined,
    }}
  >
    {children}
  </td>
);

// ─── 层级分组头行 ───
const LevelGroupHeader: FC<{ level: BoardLevel }> = ({ level }) => (
  <tr>
    <td colSpan={COLUMNS.length} className="border-b py-2" style={{ borderColor: "var(--board-border)" }}>
      <div className="flex items-center gap-2 px-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded shadow"
          style={{ background: getLevelColor(level.level) }}
        >
          <span className="text-sm font-bold text-white">{level.level}</span>
        </div>
        <span className="text-xs text-slate-500">{level.count}只</span>
      </div>
    </td>
  </tr>
);

// ─── 股票行 ───
const StockRow: FC<{
  stock: BoardStock;
  boardLevel: number;
  onClick?: (stock: BoardStock) => void;
}> = ({ stock, boardLevel, onClick }) => {
  const isUp = stock.changeDirection === "up";
  const upColor = "#ef4444";
  const downColor = "#22c55e";
  const changeColor = isUp ? upColor : downColor;
  const themeColor = getThemeColor(stock.primaryTheme);

  // Mock 数据（确定性基于 code）
  const auctionChg = mockAuctionChange();
  const peakLimit = mockPeakLimit(stock.amount);
  const mainNetVal = mockMainNet(stock.amount);
  const mainNetDir = mockMainNetDirection();
  const amplitude = mockAmplitude(stock.changeRate);

  return (
    <tr
      className="cursor-pointer border-b transition-colors hover:bg-white/[0.04]"
      style={{ borderColor: "var(--board-border)", height: 56 }}
      onClick={() => onClick?.(stock)}
    >
      {/* 1. 股票 */}
      <Td width={180} align="left">
        <div className="flex flex-col gap-0.5 px-2">
          <span className="text-sm font-bold text-white truncate">{stock.name}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">{stock.code}</span>
            <span
              className="rounded-sm px-1 py-px text-[10px] text-white"
              style={{ backgroundColor: themeColor }}
            >
              {stock.primaryTheme}
            </span>
          </div>
        </div>
      </Td>

      {/* 2. K线 */}
      <Td width={100} align="center">
        <MiniKLine seed={stock.code} height={36} />
      </Td>

      {/* 3. 分时 */}
      <Td width={100} align="center">
        <MiniTimeshare changeRate={stock.changeRate} height={36} />
      </Td>

      {/* 4. 涨跌幅 */}
      <Td width={72} align="center">
        <span
          className="inline-block rounded px-1.5 py-0.5 text-[13px] font-bold text-white"
          style={{ backgroundColor: changeColor }}
        >
          {isUp ? "+" : ""}{stock.changeRate.toFixed(2)}%
        </span>
      </Td>

      {/* 5. 最新价 */}
      <Td width={60} align="center">
        <span className="text-[13px] font-mono" style={{ color: changeColor }}>
          {stock.price.toFixed(2)}
        </span>
      </Td>

      {/* 6. 连板 */}
      <Td width={50} align="center">
        <span className="text-[13px] font-bold" style={{ color: upColor }}>
          {boardLevel}板
        </span>
      </Td>

      {/* 7. 竞价 */}
      <Td width={60} align="center">
        <span
          className="text-xs font-mono"
          style={{ color: auctionChg >= 0 ? upColor : downColor }}
        >
          {auctionChg >= 0 ? "+" : ""}{auctionChg.toFixed(1)}%
        </span>
      </Td>

      {/* 8. 涨停时间 */}
      <Td width={62} align="center" muted>
        {formatLimitTime(stock.firstLimitUpTime)}
      </Td>

      {/* 9. 封单额 */}
      <Td width={72} align="center">
        <span className="text-xs">{stock.limitAmount}</span>
      </Td>

      {/* 10. 成交额 */}
      <Td width={72} align="center">
        <span className="text-xs">{formatAmount(stock.amount)}</span>
      </Td>

      {/* 11. 峰封 */}
      <Td width={52} align="center" muted>
        {peakLimit}
      </Td>

      {/* 12. 主净 */}
      <Td width={60} align="center">
        <span
          className="text-xs font-mono"
          style={{ color: mainNetDir === "up" ? upColor : downColor }}
        >
          {mainNetDir === "up" ? "+" : "-"}{mainNetVal}
        </span>
      </Td>

      {/* 13. 卖换 */}
      <Td width={52} align="center" muted>
        {formatTurnover(stock.turnoverRate)}
      </Td>

      {/* 14. 日内 */}
      <Td width={60} align="center" muted>
        {amplitude}
      </Td>
    </tr>
  );
};

// ─── 主组件 ───
const BoardListView: FC<Props> = ({ levels, loading, selectedTheme, onStockClick }) => {
  // 过滤 + 排序
  const filtered = useMemo(() => {
    let result = [...levels];
    if (selectedTheme) {
      result = result
        .map((lv) => ({
          ...lv,
          stocks: lv.stocks.filter((s) => s.primaryTheme === selectedTheme),
          count: lv.stocks.filter((s) => s.primaryTheme === selectedTheme).length,
        }))
        .filter((lv) => lv.count > 0);
    }
    return result.sort((a, b) => b.level - a.level);
  }, [levels, selectedTheme]);

  // 加载态
  if (loading && filtered.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-slate-500">加载中...</p>
      </div>
    );
  }

  // 空数据
  if (!loading && filtered.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed"
        style={{ borderColor: "var(--board-border)", backgroundColor: "var(--board-card)" }}
      >
        <p className="text-sm text-slate-500">
          {selectedTheme ? `题材「${selectedTheme}」暂无股票` : "暂无数据"}
        </p>
      </div>
    );
  }

  const totalWidth = COLUMNS.reduce((sum, c) => sum + c.width, 0);

  return (
    <div className="overflow-hidden rounded-lg" style={{ backgroundColor: "var(--board-card)" }}>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
        <table className="w-full" style={{ minWidth: totalWidth }}>
          {/* 表头 */}
          <thead>
            <tr
              className="border-b"
              style={{
                backgroundColor: "#0f172a",
                borderColor: "var(--board-border)",
              }}
            >
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="py-2.5 text-xs font-normal text-slate-500"
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    textAlign: col.align,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体：按层级分组 */}
          <tbody>
            {filtered.map((level) => (
              <tr key={`group-${level.level}`} style={{ display: "contents" }}>
                {/* 分组头 */}
                <LevelGroupHeader level={level} />
                {/* 该层所有股票 */}
                {level.stocks.map((stock) => (
                  <StockRow
                    key={stock.code}
                    stock={stock}
                    boardLevel={level.level}
                    onClick={onStockClick}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BoardListView;
