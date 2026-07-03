/**
 * 基础设施层 — 格式化工具函数
 */

/**
 * 格式化股票价格，保留两位小数
 */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "--";
  return price.toFixed(2);
}

/**
 * 格式化涨跌幅百分比，带正负号
 */
export function formatPercent(pct: number | null | undefined): string {
  if (pct == null) return "--";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * 格式化成交量（手转为万手）
 */
export function formatVolume(volume: number | null | undefined): string {
  if (volume == null) return "--";
  const wan = volume / 10000;
  if (wan >= 10000) return `${(wan / 10000).toFixed(2)}亿手`;
  return `${wan.toFixed(2)}万手`;
}

/**
 * 格式化涨跌额，带正负号
 */
export function formatChange(change: number | null | undefined): string {
  if (change == null) return "--";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}`;
}

/**
 * 格式化成交额（元 → 亿/万）
 */
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return "--";
  const yi = amount / 1e8;
  if (yi >= 1) return `${yi.toFixed(2)}亿`;
  const wan = amount / 1e4;
  return `${wan.toFixed(0)}万`;
}
