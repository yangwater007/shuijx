/**
 * 连板天梯 Repository 接口定义
 */

import type { BoardLadder, BoardStock } from "@data/models/board.model";

export interface IBoardRepository {
  /**
   * 获取连板天梯完整数据
   * @param date 可选日期（YYYY-MM-DD），不传返回最新交易日
   * @returns 完整天梯数据
   */
  getBoardLadder(date?: string): Promise<BoardLadder>;

  /**
   * 获取指定层级的股票列表
   * @param date 可选日期
   * @param level 连板层级（如 5 表示 5连板），不传返回所有
   * @returns 股票列表
   */
  getBoardStockList(date?: string, level?: number): Promise<BoardStock[]>;
}
