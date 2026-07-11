/**
 * AI Repository — 市场上下文提取
 * 数据源: quicktiny ladder + 同花顺(大盘指数+涨跌家数) + 财联社(新闻)
 */
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from "@infra/config";
import type { NewsItem, KaipanlaItem } from "@infra/types/ai";

// ─── DeepSeek 流式对话 ──────────────────────────

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamDeepSeekChat(
  messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  model = "deepseek-chat"
): Promise<void> {
  try {
    const resp = await fetch(DEEPSEEK_BASE_URL + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + DEEPSEEK_API_KEY },
      body: JSON.stringify({ model, messages, stream: true, temperature: 0.7, max_tokens: 4096 }),
      signal,
    });
    if (!resp.ok) { const eb = await resp.text().catch(() => ""); throw new Error("API " + resp.status + ": " + eb.slice(0, 200)); }
    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No stream");
    const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;
        try {
          const p = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          if (p.choices?.[0]?.delta?.content) callbacks.onToken(p.choices[0].delta.content);
        } catch { /* skip */ }
      }
    }
    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function fetchCailianNews(): Promise<NewsItem[]> {
  try { const r = await fetch("https://stock.quicktiny.cn/api/cailian-telegraph"); if (!r.ok) return []; const j = await r.json() as { error: number; data: NewsItem[] }; return j.data ?? []; } catch { return []; }
}
export async function fetchKaipanla(): Promise<KaipanlaItem[]> {
  try { const r = await fetch("https://stock.quicktiny.cn/api/hotlist/kaipanla"); if (!r.ok) return []; const j = await r.json() as { success: boolean; data: KaipanlaItem[] }; return j.data ?? []; } catch { return []; }
}

// ─── 同花顺 realhead 解析 ──────────────────────

function parseTHSRealhead(raw: string): Record<string, string> | null {
  try {
    const start = raw.indexOf("({");
    if (start === -1) return null;
    const json = raw.slice(start + 1, raw.lastIndexOf(")"));
    const p = JSON.parse(json) as { items: Record<string, string> };
    return p.items ?? null;
  } catch { return null; }
}

interface IndexQuote {
  name: string; price: number; changePercent: number;
  open: number; high: number; low: number; preClose: number;
  amount: number;
  upCount: number; downCount: number; flatCount: number;
}

async function fetchTHSIndex(code: string): Promise<IndexQuote | null> {
  try {
    const resp = await fetch("https://d.10jqka.com.cn/v2/realhead/" + code + "/last.js");
    if (!resp.ok) return null;
    const items = parseTHSRealhead(await resp.text());
    if (!items) return null;

    const price = parseFloat(items["10"] ?? "0");
    const preClose = parseFloat(items["6"] ?? items["24"] ?? "0");
    const changePct = preClose > 0 ? ((price - preClose) / preClose) * 100 : (parseFloat(items["199112"] ?? "0"));

    // 指数级：38=上涨家数, 37=下跌家数, 39=平盘家数
    const up = parseInt(items["38"] ?? "0", 10) || 0;
    const down = parseInt(items["37"] ?? "0", 10) || 0;
    const flat = parseInt(items["39"] ?? "0", 10) || 0;

    return {
      name: items["name"] ?? "",
      price, changePercent: changePct,
      open: parseFloat(items["7"] ?? "0"), high: parseFloat(items["8"] ?? "0"),
      low: parseFloat(items["9"] ?? "0"), preClose,
      amount: parseFloat(items["19"] ?? "0"),
      upCount: up, downCount: down, flatCount: flat,
    };
  } catch { return null; }
}

async function fetchMarketOverview(): Promise<string> {
  const results = await Promise.allSettled([
    fetchTHSIndex("hs_1A0001"),
    fetchTHSIndex("sz_399001"),
    fetchTHSIndex("sz_399006"),
  ]);
  const names = ["上证指数", "深证成指", "创业板指"];

  const lines: string[] = ["=== 大盘指数（同花顺实时行情） ==="];
  let totalAmount = 0;
  let totalUp = 0, totalDown = 0, totalFlat = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r && r.status === "fulfilled" && r.value) {
      const q = r.value;
      const sign = q.changePercent >= 0 ? "+" : "";
      lines.push(q.name + ": " + q.price.toFixed(2) + " " + sign + q.changePercent.toFixed(2) + "%" +
        " 开" + q.open.toFixed(2) + " 高" + q.high.toFixed(2) + " 低" + q.low.toFixed(2) +
        " 昨收" + q.preClose.toFixed(2) + " 成交" + (q.amount >= 1e12 ? (q.amount / 1e12).toFixed(2) + "万亿" : (q.amount / 1e8).toFixed(0) + "亿"));
      totalAmount += q.amount;
      totalUp += q.upCount;
      totalDown += q.downCount;
      totalFlat += q.flatCount;
    } else {
      lines.push(names[i] + ": 获取失败");
    }
  }

  if (totalAmount > 0) {
    lines.push("两市合计成交额: " + (totalAmount >= 1e12 ? (totalAmount / 1e12).toFixed(2) + "万亿" : (totalAmount / 1e8).toFixed(0) + "亿"));
  }

  // 涨跌家数
  const breadthTotal = totalUp + totalDown + totalFlat;
  if (breadthTotal > 0) {
    lines.push("全市场涨跌家数: 上涨" + totalUp + "只 / 下跌" + totalDown + "只 / 平盘" + totalFlat + "只" +
      " (涨跌比 " + (totalDown > 0 ? (totalUp / totalDown).toFixed(2) : "0") + ":1)" +
      (totalUp > totalDown * 1.5 ? " 普涨格局" : totalDown > totalUp * 1.5 ? " 普跌格局" : " 分化行情"));
  }

  return lines.join("\n");
}

// ─── 原始类型 ──────────────────────────────────
interface RawApiStock {
  name: string; code: string; price: string; change: string; changeColor: string;
  amount: number; tradeAmount: string; limitAmount: string;
  first_limit_up_time: string; industry: string; primary_theme: string;
  open: number; high: number; low: number; yclose: number;
  main_business: string; last_limit_up_time: string; limit_up_type: string;
  open_num: number | null; continue_num: number; high_days: string;
  latest: number; change_rate: number; turnover_rate: number;
  actual_turnover_rate: number; kpl_net_change: number;
  kpl_free_float: number; kpl_turnover_rate: number;
  reason_type: string; reason_info: string;
  jiuyangongshe_category_name: string; jiuyangongshe_analysis: string;
}
interface RawApiLevel { level: number; stocks: RawApiStock[]; }
interface RawApiDate { date: string; dayOfWeek: string; totalStocks: number; pauseRatio: number; boards: RawApiLevel[]; }
interface RawApiResponse { dateRange: string; dates: RawApiDate[]; }

function analyzeTrends(dates: RawApiDate[]): string {
  if (dates.length < 2) return "";
  const latest = dates[dates.length - 1]!;
  const prev = dates[dates.length - 2]!;
  const prev2 = dates.length >= 3 ? dates[dates.length - 3] : null;
  const lines: string[] = ["=== 关键趋势信号（驱动交易计划和风险评估） ==="];
  const tDelta = latest.totalStocks - prev.totalStocks;
  lines.push("涨停数变化: " + (tDelta >= 0 ? "+" : "") + tDelta + " (" + prev.totalStocks + "->" + latest.totalStocks + ")" + (tDelta > 10 ? " 回暖" : tDelta < -10 ? " 降温" : " 平稳"));
  const pDelta = latest.pauseRatio - prev.pauseRatio;
  lines.push("炸板率变化: " + (pDelta >= 0 ? "+" : "") + pDelta.toFixed(1) + "% (" + prev.pauseRatio.toFixed(1) + "%->" + latest.pauseRatio.toFixed(1) + "%)" + (pDelta > 5 ? " 风险信号！" : pDelta < -5 ? " 积极信号" : ""));
  const latestMax = latest.boards[0]?.level ?? 0;
  const prevMax = prev.boards[0]?.level ?? 0;
  lines.push("连板高度: " + latestMax + "板" + (prevMax > 1 ? " (昨:" + prevMax + "板)" : "") + (latestMax > prevMax ? " 空间打开" : latestMax < prevMax ? " 空间压缩" : " 持平"));
  const todayHigh = latest.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
  const prevHigh = prev.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
  lines.push("高位股(>=3板): " + todayHigh.length + "只 (昨:" + prevHigh.length + "只)" + (todayHigh.length > prevHigh.length ? " 扩容" : todayHigh.length < prevHigh.length ? " 收缩" : ""));
  const todayCodes = new Set(latest.boards.flatMap((b) => b.stocks).map((s) => s.code));
  const broken = prev.boards.flatMap((b) => b.stocks).filter((s) => s.continue_num >= 2 && !todayCodes.has(s.code));
  if (broken.length > 0) lines.push("断板高位股(" + broken.length + "只): " + broken.slice(0, 5).map((s) => s.name + "(" + s.continue_num + "板)").join("、") + (broken.length > 5 ? "等" : ""));
  if (prev2) {
    const t3 = [prev2.totalStocks, prev.totalStocks, latest.totalStocks];
    const p3 = [prev2.pauseRatio, prev.pauseRatio, latest.pauseRatio];
    lines.push("三日涨停: " + t3.join(" -> ") + " (" + (t3[2]! > t3[0]! ? "上升" : "下降") + "通道)");
    lines.push("三日炸板率: " + p3.map((p) => p.toFixed(1) + "%").join(" -> ") + " (" + (p3[2]! > p3[0]! ? "恶化" : "改善") + ")");
  }
  let risk = "低"; const reasons: string[] = [];
  if (latest.pauseRatio > 35) { risk = "高"; reasons.push("炸板率>35%"); }
  else if (latest.pauseRatio > 25) { risk = "中"; reasons.push("炸板率>25%"); }
  if (latestMax <= 3) { risk = risk === "高" ? "高" : "中"; reasons.push("高度<=3"); }
  if (latest.totalStocks < 30) { risk = "高"; reasons.push("涨停<30"); }
  if (broken.length >= 5) reasons.push("断板高位>=5");
  lines.push("综合风险等级: " + risk + (reasons.length > 0 ? " (" + reasons.join("; ") + ")" : ""));
  return lines.join("\n");
}

export async function fetchBoardLadderForContext(): Promise<string> {
  const [ladderResult, overviewResult] = await Promise.allSettled([
    (async () => { try { const r = await fetch("https://stock.quicktiny.cn/api/ladder"); if (!r.ok) return null; return await r.json() as RawApiResponse; } catch { return null; } })(),
    fetchMarketOverview(),
  ]);
  const parts: string[] = [];
  if (overviewResult.status === "fulfilled" && overviewResult.value) parts.push(overviewResult.value);
  const json = ladderResult.status === "fulfilled" ? ladderResult.value : null;
  if (!json?.dates?.length) return parts.length > 0 ? parts.join("\n\n") : "";

  const dates = json.dates;
  const today = dates[dates.length - 1]!;
  const yesterday = dates.length >= 2 ? dates[dates.length - 2] : null;
  const dayBefore = dates.length >= 3 ? dates[dates.length - 3] : null;

  const lines: string[] = [];
  lines.push("=== 涨停市场数据 ===");
  lines.push("日期: " + today.date + " " + today.dayOfWeek);
  if (yesterday) lines.push("上一交易日: " + yesterday.date + " " + yesterday.dayOfWeek);
  lines.push("涨停总数: " + today.totalStocks + "只" + (yesterday ? " (昨: " + yesterday.totalStocks + "只)" : ""));
  lines.push("炸板率: " + today.pauseRatio.toFixed(1) + "%" + (yesterday ? " (昨: " + yesterday.pauseRatio.toFixed(1) + "%)" : ""));
  lines.push("");
  const estTouched = today.totalStocks / Math.max(0.01, 1 - today.pauseRatio / 100);
  lines.push("触板数(估): " + Math.round(estTouched) + "只 炸板数(估): " + Math.round(estTouched - today.totalStocks) + "只");
  lines.push("封板率: " + (100 - today.pauseRatio).toFixed(1) + "%");

  function stocksByNum(d: RawApiDate, n: number) { return d.boards.flatMap((b) => b.stocks).filter((s) => s.continue_num === n); }
  if (yesterday) {
    lines.push("");
    const y1 = stocksByNum(yesterday, 1); const t2 = stocksByNum(today, 2);
    const r12 = y1.length > 0 ? (t2.length / y1.length * 100) : 0;
    lines.push("1进2: " + r12.toFixed(1) + "% (" + t2.length + "/" + y1.length + ")" + (r12 >= 25 ? " 强" : r12 >= 15 ? " 中" : " 弱"));
    const y2 = stocksByNum(yesterday, 2); const t3 = stocksByNum(today, 3);
    const r23 = y2.length > 0 ? (t3.length / y2.length * 100) : 0;
    lines.push("2进3: " + r23.toFixed(1) + "% (" + t3.length + "/" + y2.length + ")" + (r23 >= 30 ? " 强" : r23 >= 20 ? " 中" : " 弱"));
    const yHi = yesterday.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
    const tHi = today.boards.filter((b) => b.level >= 4).flatMap((b) => b.stocks);
    const hr = yHi.length > 0 ? (tHi.length / yHi.length * 100) : 0;
    lines.push("高位晋级(>=3板): " + hr.toFixed(1) + "% (" + tHi.length + "/" + yHi.length + ")");
  }

  lines.push(""); lines.push("=== 连板天梯 ===");
  const sorted = [...today.boards].sort((a, b) => b.level - a.level);
  for (const b of sorted) {
    const d = b.stocks.map((s) => s.name + "(" + s.code.slice(0, 3) + ") [" + s.primary_theme + "] 换手" + s.turnover_rate.toFixed(1) + "% " + s.limit_up_type + " " + (s.reason_info || "")).join("\n    ");
    lines.push(b.level + "板 (" + b.stocks.length + "只):\n    " + d);
  }

  lines.push(""); lines.push("=== 题材分布 ===");
  const flatToday = today.boards.flatMap((b) => b.stocks);
  const themeMap = new Map<string, { stocks: RawApiStock[] }>();
  for (const s of flatToday) { const t = s.primary_theme || s.industry || "其他"; const e = themeMap.get(t) || { stocks: [] }; e.stocks.push(s); themeMap.set(t, e); }
  const sortedThemes = [...themeMap.entries()].sort((a, b) => b[1].stocks.length - a[1].stocks.length);
  for (const [theme, data] of sortedThemes) {
    const c = data.stocks.length; const top = data.stocks[0]!;
    const label = c >= 15 ? "[强]" : c >= 5 ? "[中]" : "[弱]";
    lines.push(theme + " " + label + " " + c + "只 龙头:" + top.name + "(" + top.continue_num + "板)" + (c > 1 ? " 跟风:" + data.stocks.slice(1, 4).map((s) => s.name).join(",") : ""));
  }

  lines.push(""); lines.push("=== 龙头定位 ===");
  if (sorted.length > 0 && sorted[0]!.stocks.length > 0) {
    const top = sorted[0]!.stocks[0]!;
    lines.push("总龙头: " + top.name + "(" + top.code + ") " + top.high_days + " " + top.primary_theme + " 换手" + top.turnover_rate.toFixed(1) + "% " + top.limit_up_type);
  }
  for (const [theme, data] of sortedThemes) {
    if (data.stocks.length >= 2) { const ld = data.stocks.reduce((a, b) => a.continue_num >= b.continue_num ? a : b); if (ld.continue_num >= 2) lines.push("题材龙[" + theme + "]: " + ld.name + " " + ld.high_days + " 换手" + ld.turnover_rate.toFixed(1) + "%"); }
  }

  lines.push(""); lines.push("=== 情绪周期三连对比 ===");
  const dc = (d: RawApiDate | null, fn: (d: RawApiDate) => string) => d ? fn(d) : "N/A";
  lines.push("指标\t\t" + dc(dayBefore, (d) => d.date) + "\t" + dc(yesterday, (d) => d.date) + "\t" + today.date);
  lines.push("涨停数\t\t" + dc(dayBefore, (d) => String(d.totalStocks)) + "\t" + dc(yesterday, (d) => String(d.totalStocks)) + "\t" + today.totalStocks);
  lines.push("炸板率\t\t" + dc(dayBefore, (d) => d.pauseRatio.toFixed(1) + "%") + "\t" + dc(yesterday, (d) => d.pauseRatio.toFixed(1) + "%") + "\t" + today.pauseRatio.toFixed(1) + "%");
  lines.push("最高连板\t" + dc(dayBefore, (d) => String(d.boards[0]?.level ?? 0)) + "\t" + dc(yesterday, (d) => String(d.boards[0]?.level ?? 0)) + "\t" + String(sorted[0]?.level ?? 0));

  const total = today.totalStocks; const maxLevel = sorted[0]?.level ?? 0;
  let stage = "未分类";
  if (total < 30 && today.pauseRatio > 40) stage = "冰点期(退潮末端)";
  else if (total >= 30 && total < 50 && yesterday && today.totalStocks > yesterday.totalStocks && today.pauseRatio < yesterday.pauseRatio) stage = "弱修复";
  else if (total >= 50 && total < 80 && maxLevel >= 4) stage = "启动期";
  else if (total >= 80 && total < 100) stage = "发酵期";
  else if (total >= 100 && maxLevel >= 7) stage = "高潮期";
  else if (yesterday && today.totalStocks < yesterday.totalStocks && today.pauseRatio > yesterday.pauseRatio) stage = "分歧期";
  else if (yesterday && today.pauseRatio > 35 && maxLevel < (yesterday.boards[0]?.level ?? 9)) stage = "退潮期";
  lines.push("情绪阶段: " + stage);

  const trend = analyzeTrends(dates);
  if (trend) { lines.push(""); lines.push(trend); }
  parts.push(lines.join("\n"));
  return parts.join("\n\n");
}