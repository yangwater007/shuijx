/**
 * useMultiDayGrid — 将 BoardDate[] 转换为日期×层级的二维网格数据
 */

import { useMemo } from "react";
import type { BoardDate, BoardStock } from "@data/models/board.model";

/** 网格单元格 */
export interface GridCell {
  stocks: BoardStock[];
}

/** 多日网格数据 */
export interface MultiDayGrid {
  /** 日期列（降序，最新在前） */
  dates: BoardDate[];
  /** 层级列表（降序，最高板在前） */
  levels: number[];
  /** 二维数据：grid[levelIndex][dateIndex] */
  grid: GridCell[][];
  /** 首板行数据：firstBoardStocks[dateIndex] */
  firstBoardStocks: BoardStock[][];
}

/**
 * 从多日天梯数据构建日期×层级网格
 */
export default function useMultiDayGrid(dates: BoardDate[]): MultiDayGrid {
  return useMemo(() => {
    if (dates.length === 0) {
      return { dates: [], levels: [], grid: [], firstBoardStocks: [] };
    }

    // 日期降序（最新在前）
    const sortedDates = [...dates].reverse();

    // 收集所有层级（去重、降序、排除首板 level===1）
    const levelSet = new Set<number>();
    for (const d of dates) {
      for (const lv of d.levels) {
        if (lv.level > 1) levelSet.add(lv.level);
      }
    }
    const sortedLevels = Array.from(levelSet).sort((a, b) => b - a);

    // 构建网格：grid[levelIndex][dateIndex]
    const grid: GridCell[][] = sortedLevels.map((level) =>
      sortedDates.map((date) => {
        const boardLevel = date.levels.find((lv) => lv.level === level);
        return { stocks: boardLevel?.stocks ?? [] };
      })
    );

    // 首板行：firstBoardStocks[dateIndex]
    const firstBoardStocks: BoardStock[][] = sortedDates.map((date) => {
      const lv1 = date.levels.find((lv) => lv.level === 1);
      return lv1?.stocks ?? [];
    });

    return {
      dates: sortedDates,
      levels: sortedLevels,
      grid,
      firstBoardStocks,
    };
  }, [dates]);
}
