/** 数据层 — 条件选股 Repository */

import type { Stock } from "@infra/types/stock";
import type { SelectorCriteria } from "@data/dto/selector";

/** 条件选股数据仓库 */
class SelectorRepository {
  /**
   * 按条件筛选股票
   * 当前返回空数据占位
   */
  async fetchByCriteria(_criteria: SelectorCriteria): Promise<Stock[]> {
    // TODO: 对接真实 API
    // const response = await http.post<SelectorResponse>("/selector/search", criteria);
    // return response.data.data;
    return [];
  }
}

const selectorRepository = new SelectorRepository();
export default selectorRepository;
export { SelectorRepository };
