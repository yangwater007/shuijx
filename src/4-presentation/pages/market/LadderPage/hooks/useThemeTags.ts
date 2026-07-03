/**
 * useThemeTags — 从连板天梯数据中提取题材标签及数量
 */

import { useMemo } from "react";
import type { BoardLevel } from "@data/models/board.model";
import type { ThemeTag } from "../components/LadderFilterBar";

export default function useThemeTags(levels: BoardLevel[]): ThemeTag[] {
  return useMemo(() => {
    const tagMap = new Map<string, number>();

    for (const lv of levels) {
      for (const stock of lv.stocks) {
        const theme = stock.primaryTheme;
        if (!theme) continue;
        tagMap.set(theme, (tagMap.get(theme) ?? 0) + 1);
      }
    }

    return Array.from(tagMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [levels]);
}
