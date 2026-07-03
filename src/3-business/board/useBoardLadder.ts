/**
 * 业务层 — 连板天梯 Hook
 */

import { useState, useCallback, useEffect, useRef } from "react";
import boardRepository from "@data/repository/board";
import BoardService from "@service/board/BoardService";
import type { BoardLevel, BoardDate, BoardLadder } from "@data/models/board.model";
import type { LadderSummary } from "@service/board/BoardService";

const EMPTY_SUMMARY: LadderSummary = {
  maxLevel: 0,
  totalStocks: 0,
  levelCount: 0,
  pauseRatio: 0,
};

export default function useBoardLadder() {
  const [levels, setLevels] = useState<BoardLevel[]>([]);
  const [dates, setDates] = useState<BoardDate[]>([]);
  const [ladder, setLadder] = useState<BoardLadder | null>(null);
  const [summary, setSummary] = useState<LadderSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestDateRef = useRef<string | undefined>(undefined);

  const refresh = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await boardRepository.getBoardLadder(date);
      const latest = BoardService.getLatestDate(data);
      const stats = BoardService.getSummary(data);

      setLadder(data);
      setLevels(latest?.levels ?? []);
      setDates(data.dates);
      setSummary(stats);
      latestDateRef.current = date;
    } catch (err) {
      const message = err instanceof Error ? err.message : "数据加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { levels, dates, ladder, summary, loading, error, refresh };
}
