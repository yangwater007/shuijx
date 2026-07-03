/**
 * 数据层 — 连板天梯 Repository
 * 实现 IBoardRepository 接口，对接真实 API
 */

import http from "@infra/http";
import type { IBoardRepository } from "@data/repositories/types/board";
import type { RawBoardLadderResponse, BoardLadder, BoardStock } from "@data/models/board.model";
import { mapRawResponse } from "@data/models/board.mapper";

class BoardRepository implements IBoardRepository {
  async getBoardLadder(date?: string): Promise<BoardLadder> {
    const params: Record<string, string> = {};
    if (date) params.date = date;

    const response = await http.get<RawBoardLadderResponse>("/ladder", { params });
    return mapRawResponse(response.data);
  }

  async getBoardStockList(date?: string, level?: number): Promise<BoardStock[]> {
    const ladder = await this.getBoardLadder(date);

    const latestDate = ladder.dates[ladder.dates.length - 1];
    if (!latestDate) return [];

    if (level !== undefined) {
      const targetLevel = latestDate.levels.find((lv) => lv.level === level);
      return targetLevel?.stocks ?? [];
    }

    return latestDate.levels.flatMap((lv) => lv.stocks);
  }
}

const boardRepository = new BoardRepository();
export default boardRepository;
export { BoardRepository };
