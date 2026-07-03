/** 数据层 — 题材演化 Repository */

import http from "@infra/http";
import type { ThemeEvolutionData } from "@data/dto/themeEvolution";
import type { RawThemeEvolutionResponse } from "@data/dto/themeEvolution";
import { MOCK_THEME_EVOLUTION_DATA, buildDomainFromRaw } from "@data/mock/themeEvolution";

class ThemeEvolutionRepository {
  /** 获取题材演化完整数据（优先真实API，失败回退Mock） */
  async fetchThemeEvolution(
    startDate?: string,
    days = 5,
    minAmount = 20
  ): Promise<ThemeEvolutionData> {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = String(startDate);
      if (days) params.days = String(days);
      if (minAmount) params.minAmount = String(minAmount);

      const response = await http.get<RawThemeEvolutionResponse>(
        "/capital-flow/theme-evolution",
        { params }
      );
      return buildDomainFromRaw(response.data);
    } catch {
      // 降级到 Mock 数据
      return { ...MOCK_THEME_EVOLUTION_DATA, updatedAt: Date.now() };
    }
  }
}

const themeEvolutionRepository = new ThemeEvolutionRepository();
export default themeEvolutionRepository;
export { ThemeEvolutionRepository };
