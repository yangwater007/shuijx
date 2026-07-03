/** 工具函数测试 — format */

import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatPercent,
  formatVolume,
  formatChange,
} from "./format";

describe("formatPrice", () => {
  it("正常数字保留两位小数", () => {
    expect(formatPrice(10.567)).toBe("10.57");
    expect(formatPrice(5)).toBe("5.00");
  });
  it("null/undefined 返回 --", () => {
    expect(formatPrice(null)).toBe("--");
    expect(formatPrice(undefined)).toBe("--");
  });
});

describe("formatPercent", () => {
  it("正数带 + 号", () => {
    expect(formatPercent(5.23)).toBe("+5.23%");
  });
  it("负数带 - 号（来自数值本身）", () => {
    expect(formatPercent(-3.1)).toBe("-3.10%");
  });
  it("null/undefined 返回 --", () => {
    expect(formatPercent(null)).toBe("--");
  });
});

describe("formatVolume", () => {
  it("万手格式化", () => {
    expect(formatVolume(50000)).toBe("5.00万手");
  });
  it("亿手格式化", () => {
    expect(formatVolume(200000000)).toBe("2.00亿手");
  });
  it("null 返回 --", () => {
    expect(formatVolume(null)).toBe("--");
  });
});

describe("formatChange", () => {
  it("正涨跌额带 + 号", () => {
    expect(formatChange(0.35)).toBe("+0.35");
  });
  it("负涨跌额自带 -", () => {
    expect(formatChange(-0.12)).toBe("-0.12");
  });
});
