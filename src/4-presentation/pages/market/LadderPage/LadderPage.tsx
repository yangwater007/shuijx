/**
 * LadderPage — 连板天梯页面主体
 */

import { useState, useCallback, useMemo, type FC } from "react";
import useBoardLadder from "@business/board/useBoardLadder";
import useThemeTags from "./hooks/useThemeTags";
import LadderHeader from "./components/LadderHeader";
import type { ViewMode } from "./components/LadderHeader";
import LadderFilterBar from "./components/LadderFilterBar";
import LadderMultiDayHeader from "./components/LadderMultiDayHeader";
import BoardSingleDay from "./components/views/BoardSingleDay";
import BoardMultiDay from "./components/views/BoardMultiDay";
import BoardListView from "./components/views/BoardListView";
import StockDetailModal from "@ui/components/business/StockDetailModal";
import type { BoardStock } from "@data/models/board.model";

const LadderPage: FC = () => {
  const { levels, dates, summary, loading, refresh } = useBoardLadder();
  const themeTags = useThemeTags(levels);

  const [viewMode, setViewMode] = useState<ViewMode>("single");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [recentDays, setRecentDays] = useState(true);
  const [showConsensus, setShowConsensus] = useState(true);
  const [groupByLevel, setGroupByLevel] = useState(true);

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState<BoardStock | null>(null);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setSelectedTheme(null);
  }, []);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleStockClick = useCallback((stock: BoardStock) => {
    setSelectedStock(stock);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedStock(null);
  }, []);



  const currentDate = new Date().toISOString().slice(0, 10);

  const dateRangeText = useMemo(() => {
    if (dates.length === 0) return "--";
    const first = dates[0]?.date;
    const last = dates[dates.length - 1]?.date;
    if (!first || !last) return "--";
    return `${first.slice(4, 6)}-${first.slice(6, 8)} 至 ${last.slice(4, 6)}-${last.slice(6, 8)}`;
  }, [dates]);

  return (
    <div>
      <LadderHeader activeView={viewMode} onViewChange={handleViewChange} />

      <div className="mb-4 grid grid-cols-4 gap-3">
        {[
          { label: "最高连板", value: summary.maxLevel, suffix: "板" },
          { label: "涨停总数", value: summary.totalStocks, suffix: "只" },
          { label: "梯队层级", value: summary.levelCount, suffix: "层" },
          { label: "炸板率", value: `${summary.pauseRatio.toFixed(1)}%`, suffix: "" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center rounded-lg px-4 py-3"
            style={{ backgroundColor: "var(--board-card)" }}
          >
            <span className="text-xs text-slate-500">{item.label}</span>
            <span className="mt-1 text-xl font-bold text-white">
              {item.value}
              {item.suffix && (
                <span className="ml-0.5 text-xs font-normal text-slate-500">{item.suffix}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {viewMode !== "multi" && (
        <LadderFilterBar
          themeTags={themeTags}
          selectedTheme={selectedTheme}
          onThemeSelect={setSelectedTheme}
          currentDate={currentDate}
          isListView={viewMode === "list"}
          groupByLevel={groupByLevel}
          onToggleGroupByLevel={() => setGroupByLevel(!groupByLevel)}
          onRefresh={handleRefresh}
          loading={loading}
        />
      )}

      {viewMode === "multi" && (
        <LadderMultiDayHeader
          dateRange={dateRangeText}
          recentDays={recentDays}
          onToggleRecentDays={() => setRecentDays(!recentDays)}
          onRefresh={handleRefresh}
          showConsensus={showConsensus}
          onToggleConsensus={() => setShowConsensus(!showConsensus)}
          onOpenSettings={() => {}}
          loading={loading}
        />
      )}

      <div>
        {viewMode === "single" && (
          <BoardSingleDay
            levels={levels}
            selectedTheme={selectedTheme}
            loading={loading}
            onStockClick={handleStockClick}
          />
        )}
        {viewMode === "multi" && (
          <BoardMultiDay
            dates={dates}
            loading={loading}
            onStockClick={handleStockClick}
          />
        )}
        {viewMode === "list" && (
          <BoardListView levels={levels} selectedTheme={selectedTheme} loading={loading} onStockClick={handleStockClick} />
        )}
      </div>

      {/* 个股详情弹窗 */}
      <StockDetailModal
        visible={modalVisible}
        stock={selectedStock}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default LadderPage;
