/**
 * AI Repository — DeepSeek 对话 + 新闻/热榜 + 市场上下文提取
 * 数据源: quicktiny ladder API + 东方财富(大盘指数/成交额)
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
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error("API " + resp.status + ": " + errBody.slice(0, 200));
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) callbacks.onToken(content);
        } catch { /* skip parse failures */ }
      }
    }

    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ─── 新闻/热榜 ──────────────────────────────────

export async function fetchCailianNews(): Promise<NewsItem[]> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/cailian-telegraph");
    if (!resp.ok) return [];
    const json = (await resp.json()) as { error: number; data: NewsItem[] };
    return json.data ?? [];
  } catch { return []; }
}

export async function fetchKaipanla(): Promise<KaipanlaItem[]> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/hotlist/kaipanla");
    if (!resp.ok) return [];
    const json = (await resp.json()) as { success: boolean; data: KaipanlaItem[] };
    return json.data ?? [];
  } catch { return []; }
}

export async function fetchYicaiNews(): Promise<Array<{ id: string; title: string; summary: string; url: string; source: string }>> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/news/yicai");
    if (!resp.ok) return [];
    const json = (await resp.json()) as { success: boolean; data: Array<{ id: string; title: string; summary: string; url: string; source: string }> };
    return json.data ?? [];
  } catch { return []; }
}

// ─── 东方财富 大盘指数 ──────────────────────────

interface IndexQuote {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  preClose: number;
  volume: number;  // 手
  amount: number;  // 元
}

async function fetchEMIndex(secid: string): Promise<IndexQuote | null> {
  try {
    const url = "https://push2.eastmoney.com/api/qt/stock/get?secid=" + secid +
      "&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170,f171";
    const resp = await fetch(url, {
      headers: { Referer: "https://quote.eastmoney.com/" },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      data?: {
        f43: number; f44: number; f45: number; f46: number;
        f47: number; f48: number; f57: string; f58: string;
        f60: number; f169: number; f170: number; f171: number;
      };
    };
    const d = json.data;
    if (!d) return null;
    return {
      name: d.f58,
      code: d.f57,
      price: d.f43 / 100,
      change: (d.f43 - (d.f60 || d.f43)) / 100,
      changePercent: d.f60 ? ((d.f43 - d.f60) / d.f60) * 100 : 0,
      open: d.f46 / 100,
      high: d.f44 / 100,
      low: d.f45 / 100,
      preClose: (d.f60 || d.f43) / 100,
      volume: d.f47,
      amount: d.f48,
    };
  } catch { return null; }
}

/** 获取大盘概览数据（上证指数 + 深证成指 + 创业板指） */
async function fetchMarketOverview(): Promise<string> {
  const results = await Promise.allSettled([
    fetchEMIndex("1.000001"),  // 上证指数
    fetchEMIndex("0.399001"),  // 深证成指
    fetchEMIndex("0.399006"),  // 创业板指
  ]);

  const lines: string[] = ["=== 大盘指数（东方财富实时数据） ==="];
  const names = ["上证指数", "深证成指", "创业板指"];

  for (let i = 0; i < 3; i++) {
    const r = results[i];
    if (r && r.status === "fulfilled" && r.value) {
      const q = r.value;
      const sign = q.changePercent >= 0 ? "+" : "";
      lines.push(
        q.name + ": " + q.price.toFixed(2) +
        " " + sign + q.changePercent.toFixed(2) + "%" +
        " 开盘" + q.open.toFixed(2) +
        " 最高" + q.high.toFixed(2) +
        " 最低" + q.low.toFixed(2) +
        " 昨收" + q.preClose.toFixed(2) +
        " 成交额" + (q.amount >= 1e12 ? (q.amount / 1e12).toFixed(2) + "万亿" : (q.amount / 1e8).toFixed(0) + "亿")
      );
    } else {
      lines.push(names[i] + ": 获取失败");
    }
  }

  // 合并成交额
  let totalAmount = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) totalAmount += r.value.amount;
  }
  if (totalAmount > 0) {
    lines.push("两市合计成交额: " + (totalAmount >= 1e12 ? (totalAmount / 1e12).toFixed(2) + "万亿" : (totalAmount / 1e8).toFixed(0) + "亿"));
  }

  return lines.join("\n");
}

// ─── 原始 API 类型 (ladder) ──────────────────────
interface RawApiStock {
  name: string; code: string; price: string; change: string; changeColor: string;
  amount: number; tradeAmount: string; limitAmount: string;
  first_limit_up_time: string; industry: string; primary_theme: string;
  open: number; high: number; low: number; yclose: number;
  main_business: string; business_scope: string;
  last_limit_up_time: string; limit_up_type: string;
  open_num: number | null; continue_num: number; high_days: string;
  latest: number; change_rate: number; currency_value: number;
  actual_currency_value: number; turnover_rate: number;
  actual_turnover_rate: number; order_volume: number; order_amount: number;
  trading_amount: number; kpl_trading_amount: number;
  kpl_limit_order: number; kpl_lu_limit_order: number;
  kpl_net_change: number; kpl_free_float: number; kpl_turnover_rate: number;
  reason_type: string; reason_info: string;
  jiuyangongshe_category_name: string; jiuyangongshe_analysis: string;
}
interface RawApiLevel { level: number; stocks: RawApiStock[]; }
interface RawApiDate { date: string; dayOfWeek: string; totalStocks: number; pauseRatio: number; boards: RawApiLevel[]; }
interface RawApiResponse { dateRange: string; dates: RawApiDate[]; }

// ─── 市场上下文提取 ──────────────────────────────

export async function fetchBoardLadderForContext(): Promise<string> {
  // 并行获取连板数据 + 大盘数据
  const [ladderResult, overviewResult] = await Promise.allSettled([
    (async () => {
      try {
        const resp = await fetch("https://stock.quicktiny.cn/api/ladder");
        if (!resp.ok) return null;
        return (await resp.json()) as RawApiResponse;
      } catch { return null; }
    })(),
    fetchMarketOverview(),
  ]);

  // 大盘概览
  const parts: string[] = [];
  if (overviewResult.status === "fulfilled" && overviewResult.value) {
    parts.push(overviewResult.value);
  }

  // 连板天梯数据
  const json = ladderResult.status === "fulfilled" ? ladderResult.value : null;
  if (!json || !json.dates?.length) {
    if (parts.length === 0) return "";
    return parts.join("\n\n");
  }

  const today = json.dates[json.dates.length - 1]!;
  const yesterday = json.dates.length >= 2 ? json.dates[json.dates.length - 2] : null;
  const dayBefore = json.dates.length >= 3 ? json.dates[json.dates.length - 3] : null;

  // ── 大盘概览补充（涨停数据部分）──
  const lines: string[] = [];
  lines.push("日期: " + today.date + " " + today.dayOfWeek);
  if (yesterday) lines.push("上一交易日: " + yesterday.date + " " + yesterday.dayOfWeek);
  lines.push("涨停总数(今日): " + today.totalStocks + "只" + (yesterday ? " (昨: " + yesterday.totalStocks + "只)" : ""));
  lines.push("炸板率(今日): " + today.pauseRatio.toFixed(1) + "%" + (yesterday ? " (昨: " + yesterday.pauseRatio.toFixed(1) + "%)" : ""));

  // ── 情绪速览 ──
  lines.push("");
  lines.push("=== 情绪速览 ===");
  const estimatedTouched = today.totalStocks / Math.max(0.01, 1 - today.pauseRatio / 100);
  lines.push("触板数(估): " + Math.round(estimatedTouched) + "只, 炸板数(估): " + Math.round(estimatedTouched - today.totalStocks) + "只");
  lines.push("封板率: " + (100 - today.pauseRatio).toFixed(1) + "%");

  // ── 晋级率 ──
  lines.push("");
  lines.push("=== 晋级率明细 ===");

  function stocksByContinue(d: RawApiDate, n: number): RawApiStock[] {
    return d.boards.flatMap((b) => b.stocks).filter((s) => s.continue_num === n);
  }

  if (yesterday) {
    const y1 = stocksByContinue(yesterday, 1);
    const t2 = stocksByContinue(today, 2);
    const rate1to2 = y1.length > 0 ? (t2.length / y1.length * 100) : 0;
    lines.push("1进2晋级率: " + rate1to2.toFixed(1) + "% (" + t2.length + "/" + y1.length + ")" +
      (rate1to2 >= 25 ? " 强" : rate1to2 >= 15 ? " 中" : " 弱"));

    const y2 = stocksByContinue(yesterday, 2);
    const t3 = stocksByContinue(today, 3);
    const rate2to3 = y2.length > 0 ? (t3.length / y2.length * 100) : 0;
    lines.push("2进3晋级率: " + rate2to3.toFixed(1) + "% (" + t3.length + "/" + y2.length + ")" +
      (rate2to3 >= 30 ? " 强" : rate2to3 >= 20 ? " 中" : " 弱"));

    const yHigh = yesterday.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
    const tHigh = today.boards.filter((b) => b.level >= 4).flatMap((b) => b.stocks);
    const highRate = yHigh.length > 0 ? (tHigh.length / yHigh.length * 100) : 0;
    lines.push("高位晋级率(>=3板): " + highRate.toFixed(1) + "% (" + tHigh.length + "/" + yHigh.length + ")");
  }

  // ── 连板天梯 ──
  lines.push("");
  lines.push("=== 连板天梯 ===");
  const sortedBoards = [...today.boards].sort((a, b) => b.level - a.level);
  for (const board of sortedBoards) {
    const stocks = board.stocks;
    const stockDescs = stocks.map((s) =>
      s.name + "(" + s.code.slice(0, 3) + ") [" + s.primary_theme + "] "
      + "换手" + s.turnover_rate.toFixed(1) + "% "
      + s.limit_up_type + " "
      + (s.reason_info || "")
    ).join("\n    ");
    lines.push(board.level + "板 (" + stocks.length + "只):\n    " + stockDescs);
  }

  // ── 题材聚类 ──
  lines.push("");
  lines.push("=== 题材分布 ===");
  const flatToday = today.boards.flatMap((b) => b.stocks);
  const themeMap = new Map<string, { stocks: RawApiStock[]; totalChange: number }>();
  for (const s of flatToday) {
    const theme = s.primary_theme || s.industry || "其他";
    const entry = themeMap.get(theme) || { stocks: [], totalChange: 0 };
    entry.stocks.push(s);
    entry.totalChange += s.change_rate;
    themeMap.set(theme, entry);
  }
  const sortedThemes = [...themeMap.entries()]
    .sort((a, b) => b[1].stocks.length - a[1].stocks.length);

  for (const [theme, data] of sortedThemes) {
    const count = data.stocks.length;
    const topStock = data.stocks[0]!;
    const label = count >= 15 ? "[强]" : count >= 5 ? "[中]" : "[弱]";
    lines.push(theme + " " + label + " " + count + "只涨停 龙头:" + topStock.name +
      "(" + topStock.continue_num + "板)" +
      (data.stocks.length > 1 ? " 跟风:" + data.stocks.slice(1, 4).map((s) => s.name).join(",") : ""));
  }

  // ── 龙头定位 ──
  lines.push("");
  lines.push("=== 龙头定位 ===");
  if (sortedBoards.length > 0 && sortedBoards[0]!.stocks.length > 0) {
    const topStock = sortedBoards[0]!.stocks[0]!;
    lines.push("总龙头: " + topStock.name + "(" + topStock.code + ") " +
      topStock.high_days + " " + topStock.primary_theme +
      " 换手" + topStock.turnover_rate.toFixed(1) + "% " +
      topStock.limit_up_type);
  }
  for (const [theme, data] of sortedThemes) {
    if (data.stocks.length >= 2) {
      const leader = data.stocks.reduce((a, b) => a.continue_num >= b.continue_num ? a : b);
      if (leader.continue_num >= 2) {
        lines.push("题材龙[" + theme + "]: " + leader.name + " " +
          leader.high_days + " 换手" + leader.turnover_rate.toFixed(1) + "%");
      }
    }
  }

  // ── 情绪周期 ──
  lines.push("");
  lines.push("=== 情绪周期三连对比 ===");
  lines.push("指标\t\t" + (dayBefore ? dayBefore.date : "N/A") + "\t" +
    (yesterday ? yesterday.date : "N/A") + "\t" + today.date);
  const dateCol = (d: RawApiDate | null, fn: (d: RawApiDate) => string) =>
    d ? fn(d) : "N/A";
  lines.push("涨停数\t\t" + dateCol(dayBefore, (d) => String(d.totalStocks)) + "\t" +
    dateCol(yesterday, (d) => String(d.totalStocks)) + "\t" + today.totalStocks);
  lines.push("炸板率\t\t" + dateCol(dayBefore, (d) => d.pauseRatio.toFixed(1) + "%") + "\t" +
    dateCol(yesterday, (d) => d.pauseRatio.toFixed(1) + "%") + "\t" + today.pauseRatio.toFixed(1) + "%");
  lines.push("最高连板\t" + dateCol(dayBefore, (d) => String(d.boards[0]?.level ?? 0)) + "\t" +
    dateCol(yesterday, (d) => String(d.boards[0]?.level ?? 0)) + "\t" +
    String(sortedBoards[0]?.level ?? 0));

  const total = today.totalStocks;
  const maxLevel = sortedBoards[0]?.level ?? 0;
  let stage = "未分类";
  if (total < 30 && today.pauseRatio > 40) stage = "冰点期(退潮末端)";
  else if (total >= 30 && total < 50 && yesterday && today.totalStocks > yesterday.totalStocks && today.pauseRatio < yesterday.pauseRatio) stage = "弱修复";
  else if (total >= 50 && total < 80 && maxLevel >= 4) stage = "启动期(新周期萌芽)";
  else if (total >= 80 && total < 100) stage = "发酵期(赚钱效应扩散)";
  else if (total >= 100 && maxLevel >= 7) stage = "高潮期(情绪亢奋)";
  else if (yesterday && today.totalStocks < yesterday.totalStocks && today.pauseRatio > yesterday.pauseRatio) stage = "分歧期(高位分化)";
  else if (yesterday && today.pauseRatio > 35 && maxLevel < (yesterday.boards[0]?.level ?? 9)) stage = "退潮期(亏钱效应蔓延)";
  lines.push("情绪阶段判定: " + stage);

  // 大盘数据在前，连板数据在后
  parts.push(lines.join("\n"));
  return parts.join("\n\n");
}

export async function fetchLadderContextSimple(): Promise<string> {
  return fetchBoardLadderForContext();
}