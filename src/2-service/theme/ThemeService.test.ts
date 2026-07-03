/** 服务层测试 — ThemeService */

import { describe, it, expect } from "vitest";
import ThemeService from "./ThemeService";
import type { Theme } from "@data/dto/theme";

const themes: Theme[] = [
  { id: "1", name: "人工智能", description: "AI 相关概念", stockCount: 30, category: "科技", heat: 90 },
  { id: "2", name: "新能源", description: "风光储氢", stockCount: 45, category: "能源", heat: 80 },
  { id: "3", name: "芯片", description: "半导体芯片", stockCount: 25, category: "科技", heat: 85 },
  { id: "4", name: "光伏", description: "太阳能光伏", stockCount: 35, category: "能源", heat: 70 },
];

describe("ThemeService", () => {
  describe("groupByCategory", () => {
    it("按分类分组并在组内按热度降序", () => {
      const cats = ThemeService.groupByCategory(themes);
      expect(cats).toHaveLength(2);

      const tech = cats.find((c) => c.name === "科技")!;
      expect(tech.themes).toHaveLength(2);
      expect(tech.themes[0]!.id).toBe("1"); // heat 90 > 85

      const energy = cats.find((c) => c.name === "能源")!;
      expect(energy.themes).toHaveLength(2);
      expect(energy.themes[0]!.id).toBe("2"); // heat 80 > 70
    });

    it("空数组返回空", () => {
      expect(ThemeService.groupByCategory([])).toHaveLength(0);
    });
  });

  describe("search", () => {
    it("按名称模糊搜索", () => {
      const r = ThemeService.search(themes, "人工");
      expect(r).toHaveLength(1);
      expect(r[0]!.id).toBe("1");
    });

    it("按描述搜索", () => {
      const r = ThemeService.search(themes, "半导体");
      expect(r).toHaveLength(1);
      expect(r[0]!.id).toBe("3");
    });

    it("空关键词返回全部", () => {
      const r = ThemeService.search(themes, "");
      expect(r).toHaveLength(4);
    });

    it("无匹配返回空", () => {
      const r = ThemeService.search(themes, "ZZZ不存在");
      expect(r).toHaveLength(0);
    });
  });

  describe("processThemeList", () => {
    it("返回分类 + 扁平列表 + 统计", () => {
      const data = ThemeService.processThemeList(themes);
      expect(data.categories).toHaveLength(2);
      expect(data.allThemes).toHaveLength(4);
      expect(data.total).toBe(4);
      expect(data.allThemes[0]!.id).toBe("1"); // 最高热度 90
    });
  });
});
