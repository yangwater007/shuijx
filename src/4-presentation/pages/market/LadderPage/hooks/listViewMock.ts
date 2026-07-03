/**
 * listViewMock — 列表视图 Mock 数据工具
 * 为暂无真实数据的列生成模拟值
 */

/**
 * 生成竞价涨跌幅（-10 ~ +10 之间的随机值）
 */
export function mockAuctionChange(): number {
  return +((Math.random() - 0.45) * 12).toFixed(1);
}

/**
 * 格式化涨停时间
 * firstLimitUpTime 是 Unix 秒级时间戳字符串
 */
export function formatLimitTime(timestamp: string): string {
  if (!timestamp || timestamp === "0") return "--";
  const ts = parseInt(timestamp, 10) * 1000;
  if (isNaN(ts)) return "--";
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * 生成峰值封单（Mock）
 */
export function mockPeakLimit(baseAmount: number): string {
  const ratio = 0.8 + Math.random() * 0.6;
  const val = baseAmount * ratio;
  return formatListAmount(val);
}

/**
 * 生成主力净流入（Mock）
 */
export function mockMainNet(baseAmount: number): string {
  const ratio = (Math.random() - 0.4) * 0.3;
  const val = baseAmount * ratio;
  return formatListAmount(Math.abs(val));
}

/**
 * 主力净流入方向
 */
export function mockMainNetDirection(): "up" | "down" {
  return Math.random() > 0.35 ? "up" : "down";
}

/**
 * 日内振幅（Mock）
 */
export function mockAmplitude(changeRate: number): string {
  const amp = Math.abs(changeRate) * (0.8 + Math.random() * 1.2);
  return `${amp.toFixed(1)}%`;
}

/**
 * 列表用金额格式化（紧凑）
 */
export function formatListAmount(amount: number): string {
  const yi = amount / 1e8;
  if (yi >= 1) return `${yi.toFixed(2)}亿`;
  const wan = amount / 1e4;
  if (wan >= 1) return `${wan.toFixed(0)}万`;
  return `${amount.toFixed(0)}`;
}

/**
 * 格式化换手率为百分比字符串
 */
export function formatTurnover(rate: number): string {
  return `${rate.toFixed(1)}%`;
}
