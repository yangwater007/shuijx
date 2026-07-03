/** 数据层 — 题材库 Repository */

import type { Theme, ThemeDetail } from "@data/dto/theme";

/** 题材库数据仓库 */
class ThemeRepository {
  /** 获取题材列表 */
  async fetchThemeList(): Promise<Theme[]> {
    // TODO: 对接真实 API
    return [];
  }

  /** 获取题材详情（含关联股票） */
  async fetchThemeDetail(_themeId: string): Promise<ThemeDetail | null> {
    // TODO: 对接真实 API
    return null;
  }

  /** 按关键词搜索题材 */
  async searchThemes(_keyword: string): Promise<Theme[]> {
    // TODO: 对接真实 API
    return [];
  }
}

const themeRepository = new ThemeRepository();
export default themeRepository;
export { ThemeRepository };
