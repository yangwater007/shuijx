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

// ─── 东方财富 大盘指数 ──────────────────────────

interface IndexQuote {
  name: string; code: string; price: number; change: number;
  changePercent: number; open: number; high: number; low: number;
  preClose: number; volume: number; amount: number;
}

async function fetchEMIndex(secid: string): Promise<IndexQuote | null> {
  try {
    const url = "https://push2.eastmoney.com/api/qt/stock/get?secid=" + secid +
      "&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60";
    const resp = await fetch(url, {
      headers: { Referer: "https://quote.eastmoney.com/" },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      data?: { f43: number; f44: number; f45: number; f46: number;
        f47: number; f48: number; f57: string; f58: string; f60: number; };
    };
    const d = json.data;
    if (!d) return null;
    return {
      name: d.f58, code: d.f57,
      price: d.f43 / 100, change: (d.f43 - (d.f60 || d.f43)) / 100,
      changePercent: d.f60 ? ((d.f43 - d.f60) / d.f60) * 100 : 0,
      open: d.f46 / 100, high: d.f44 / 100, low: d.f45 / 100,
      preClose: (d.f60 || d.f43) / 100,
      volume: d.f47, amount: d.f48,
    };
  } catch { return null; }
}

async function fetchMarketOverview(): Promise<string> {
  const results = await Promise.allSettled([
    fetchEMIndex("1.000001"),
    fetchEMIndex("0.399001"),
    fetchEMIndex("0.399006"),
  ]);

  const lines: string[] = ["=== 大盘指数（东方财富实时数据） ==="];
  const names = ["上证指数", "深证成指", "创业板指"];
  let totalAmount = 0;

  for (let i = 0; i < 3; i++) {
    const r = results[i];
    if (r && r.status === "fulfilled" && r.value) {
      const q = r.value;
      const sign = q.changePercent >= 0 ? "+" : "";
      lines.push(q.name + ": " + q.price.toFixed(2) +
        " " + sign + q.changePercent.toFixed(2) + "%" +
        " 开盘" + q.open.toFixed(2) + " 最高" + q.high.toFixed(2) +
        " 最低" + q.low.toFixed(2) + " 昨收" + q.preClose.toFixed(2) +
        " 成交额" + (q.amount >= 1e12 ? (q.amount / 1e12).toFixed(2) + "万亿" : (q.amount / 1e8).toFixed(0) + "亿"));
      totalAmount += q.amount;
    } else {
      lines.push(names[i] + ": 获取失败");
    }
  }

  if (totalAmount > 0) {
    lines.push("两市合计成交额: " + (totalAmount >= 1e12 ? (totalAmount / 1e12).toFixed(2) + "万亿" : (totalAmount / 1e8).toFixed(0) + "亿"));
  }

  return lines.join("\n");
}

// ─── 原始 API 类型 ──────────────────────────────
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

// ─── 趋势分析 ──────────────────────────────────

function analyzeTrends(dates: RawApiDate[]): string {
  if (dates.length < 2) return "";
  const latest = dates[dates.length - 1]!;
  const prev = dates[dates.length - 2]!;
  const prev2 = dates.length >= 3 ? dates[dates.length - 3] : null;

  const lines: string[] = ["=== 关键趋势信号（用于交易计划和风险评估） ==="];

  // 涨停数趋势
  const tDelta = latest.totalStocks - prev.totalStocks;
  lines.push("涨停数变化: " + (tDelta >= 0 ? "+" : "") + tDelta + "只 (" + prev.totalStocks + " -> " + latest.totalStocks + ")" +
    (tDelta > 10 ? " 情绪显著回暖" : tDelta < -10 ? " 情绪明显降温" : " 情绪平稳"));

  // 炸板率趋势
  const pDelta = latest.pauseRatio - prev.pauseRatio;
  lines.push("炸板率变化: " + (pDelta >= 0 ? "+" : "") + pDelta.toFixed(1) + "% (" + prev.pauseRatio.toFixed(1) + "% -> " + latest.pauseRatio.toFixed(1) + "%)" +
    (pDelta > 5 ? " 风险信号！封板意愿下降" : pDelta < -5 ? " 积极信号，封板意愿增强" : ""));

  // 连板高度趋势
  const latestMax = latest.boards[0]?.level ?? 0;
  const prevMax = prev.boards[0]?.level ?? 0;
  lines.push("连板高度: " + latestMax + "板" + (prevMax > 1 ? " (昨: " + prevMax + "板)" : "") +
    (latestMax > prevMax ? " 空间打开" : latestMax < prevMax ? " 空间压缩" : " 高度持平"));

  // 高位股表现
  const todayHigh = latest.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
  const prevHigh = prev.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
  lines.push("高位股(>=3板): " + todayHigh.length + "只" + " (昨: " + prevHigh.length + "只)" +
    (todayHigh.length > prevHigh.length ? " 高位扩容" : todayHigh.length < prevHigh.length ? " 高位收缩" : ""));

  // 炸板股识别：之前有 continue_num 的股今天不在 ladder 中 = 断板
  if (prev2) {
    const prevBoards = prev.boards.flatMap((b) => b.stocks);
    const todayCodes = new Set(latest.boards.flatMap((b) => b.stocks).map((s) => s.code));
    const broken = prevBoards.filter((s) => s.continue_num >= 2 && !todayCodes.has(s.code));
    if (broken.length > 0) {
      lines.push("断板高位股(" + broken.length + "只): " + broken.slice(0, 5).map((s) => s.name + "(" + s.continue_num + "板)").join("、") +
        (broken.length > 5 ? "等" : ""));
    }
  }

  // 连续趋势（三天）
  if (prev2) {
    const trend3 = [prev2.totalStocks, prev.totalStocks, latest.totalStocks];
    const trendP = [prev2.pauseRatio, prev.pauseRatio, latest.pauseRatio];
    lines.push("三日涨停趋势: " + trend3.join(" -> ") + " (" + (trend3[2]! > trend3[0]! ? "上升通道" : "下降通道") + ")");
    lines.push("三日炸板率趋势: " + trendP.map((p) => p.toFixed(1) + "%").join(" -> ") + " (" + (trendP[2]! > trendP[0]! ? "恶化" : "改善") + ")");
  }

  // 风险等级自动判定
  let riskLevel = "低";
  const riskReasons: string[] = [];
  if (latest.pauseRatio > 35) { riskLevel = "高"; riskReasons.push("炸板率>35%"); }
  else if (latest.pauseRatio > 25) { riskLevel = "中"; riskReasons.push("炸板率>25%"); }
  if (latestMax <= 3) { riskLevel = riskLevel === "高" ? "高" : "中"; riskReasons.push("连板高度<=3板"); }
  if (latest.totalStocks < 30) { riskLevel = "高"; riskReasons.push("涨停<30只，情绪冰点"); }
  if (broken.length >= 5) { riskReasons.push("断板高位股>=5只"); }
  lines.push("综合风险等级: " + riskLevel + (riskReasons.length > 0 ? " (" + riskReasons.join("; ") + ")" : ""));

  return lines.join("\n");
}

// ─── 市场上下文主函数 ──────────────────────────

export async function fetchBoardLadderForContext(): Promise<string> {
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

  const parts: string[] = [];
  if (overviewResult.status === "fulfilled" && overviewResult.value) {
    parts.push(overviewResult.value);
  }

  const json = ladderResult.status === "fulfilled" ? ladderResult.value : null;
  if (!json || !json.dates?.length) {
    return parts.length > 0 ? parts.join("\n\n") : "";
  }

  const dates = json.dates;
  const today = dates[dates.length - 1]!;
  const yesterday = dates.length >= 2 ? dates[dates.length - 2] : null;
  const dayBefore = dates.length >= 3 ? dates[dates.length - 3] : null;

  const lines: string[] = [];

  // 1. 大盘概览补充
  lines.push("=== 涨停市场数据 ===");
  lines.push("日期: " + today.date + " " + today.dayOfWeek);
  if (yesterday) lines.push("上一交易日: " + yesterday.date + " " + yesterday.dayOfWeek);
  lines.push("涨停总数: " + today.totalStocks + "只" + (yesterday ? " (昨: " + yesterday.totalStocks + "只)" : ""));
  lines.push("炸板率: " + today.pauseRatio.toFixed(1) + "%" + (yesterday ? " (昨: " + yesterday.pauseRatio.toFixed(1) + "%)" : ""));

  // 2. 情绪速览
  lines.push("");
  const estimatedTouched = today.totalStocks / Math.max(0.01, 1 - today.pauseRatio / 100);
  lines.push("触板数(估): " + Math.round(estimatedTouched) + "只 炸板数(估): " + Math.round(estimatedTouched - today.totalStocks) + "只");
  lines.push("封板率: " + (100 - today.pauseRatio).toFixed(1) + "%");

  // 3. 晋级率
  function stocksByContinue(d: RawApiDate, n: number): RawApiStock[] {
    return d.boards.flatMap((b) => b.stocks).filter((s) => s.continue_num === n);
  }

  if (yesterday) {
    lines.push("");
    const y1 = stocksByContinue(yesterday, 1);
    const t2 = stocksByContinue(today, 2);
    const r12 = y1.length > 0 ? (t2.length / y1.length * 100) : 0;
    lines.push("1进2: " + r12.toFixed(1) + "% (" + t2.length + "/" + y1.length + ")" + (r12 >= 25 ? " 强" : r12 >= 15 ? " 中" : " 弱"));

    const y2 = stocksByContinue(yesterday, 2);
    const t3 = stocksByContinue(today, 3);
    const r23 = y2.length > 0 ? (t3.length / y2.length * 100) : 0;
    lines.push("2进3: " + r23.toFixed(1) + "% (" + t3.length + "/" + y2.length + ")" + (r23 >= 30 ? " 强" : r23 >= 20 ? " 中" : " 弱"));

    const yHigh = yesterday.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
    const tHigh = today.boards.filter((b) => b.level >= 4).flatMap((b) => b.stocks);
    const hr = yHigh.length > 0 ? (tHigh.length / yHigh.length * 100) : 0;
    lines.push("高位晋级(>=3板): " + hr.toFixed(1) + "% (" + tHigh.length + "/" + yHigh.length + ")");
  }

  // 4. 连板天梯
  lines.push("");
  lines.push("=== 连板天梯 ===");
  const sortedBoards = [...today.boards].sort((a, b) => b.level - a.level);
  for (const board of sortedBoards) {
    const descs = board.stocks.map((s) =>
      s.name + "(" + s.code.slice(0, 3) + ") [" + s.primary_theme + "] " +
      "换手" + s.turnover_rate.toFixed(1) + "% " + s.limit_up_type + " " + (s.reason_info || "")
    ).join("\n    ");
    lines.push(board.level + "板 (" + board.stocks.length + "只):\n    " + descs);
  }

  // 5. 题材聚类
  lines.push("");
  lines.push("=== 题材分布 ===");
  const flatToday = today.boards.flatMap((b) => b.stocks);
  const themeMap = new Map<string, { stocks: RawApiStock[] }>();
  for (const s of flatToday) {
    const theme = s.primary_theme || s.industry || "其他";
    const entry = themeMap.get(theme) || { stocks: [] };
    entry.stocks.push(s);
    themeMap.set(theme, entry);
  }
  const sortedThemes = [...themeMap.entries()].sort((a, b) => b[1].stocks.length - a[1].stocks.length);

  for (const [theme, data] of sortedThemes) {
    const count = data.stocks.length;
    const top = data.stocks[0]!;
    const label = count >= 15 ? "[强]" : count >= 5 ? "[中]" : "[弱]";
    lines.push(theme + " " + label + " " + count + "只 龙头:" + top.name + "(" + top.continue_num + "板)" +
      (data.stocks.length > 1 ? " 跟风:" + data.stocks.slice(1, 4).map((s) => s.name).join(",") : ""));
  }

  // 6. 龙头定位
  lines.push("");
  lines.push("=== 龙头定位 ===");
  if (sortedBoards.length > 0 && sortedBoards[0]!.stocks.length > 0) {
    const top = sortedBoards[0]!.stocks[0]!;
    lines.push("总龙头: " + top.name + "(" + top.code + ") " + top.high_days + " " + top.primary_theme +
      " 换手" + top.turnover_rate.toFixed(1) + "% " + top.limit_up_type);
  }
  for (const [theme, data] of sortedThemes) {
    if (data.stocks.length >= 2) {
      const leader = data.stocks.reduce((a, b) => a.continue_num >= b.continue_num ? a : b);
      if (leader.continue_num >= 2) {
        lines.push("题材龙[" + theme + "]: " + leader.name + " " + leader.high_days + " 换手" + leader.turnover_rate.toFixed(1) + "%");
      }
    }
  }

  // 7. 情绪周期
  lines.push("");
  lines.push("=== 情绪周期三连对比 ===");
  lines.push("指标\t\t" + (dayBefore ? dayBefore.date : "N/A") + "\t" + (yesterday ? yesterday.date : "N/A") + "\t" + today.date);
  const dc = (d: RawApiDate | null, fn: (d: RawApiDate) => string) => d ? fn(d) : "N/A";
  lines.push("涨停数\t\t" + dc(dayBefore, (d) => String(d.totalStocks)) + "\t" + dc(yesterday, (d) => String(d.totalStocks)) + "\t" + today.totalStocks);
  lines.push("炸板率\t\t" + dc(dayBefore, (d) => d.pauseRatio.toFixed(1) + "%") + "\t" + dc(yesterday, (d) => d.pauseRatio.toFixed(1) + "%") + "\t" + today.pauseRatio.toFixed(1) + "%");
  lines.push("最高连板\t" + dc(dayBefore, (d) => String(d.boards[0]?.level ?? 0)) + "\t" + dc(yesterday, (d) => String(d.boards[0]?.level ?? 0)) + "\t" + String(sortedBoards[0]?.level ?? 0));

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
  lines.push("情绪阶段: " + stage);

  // 8. 趋势信号（关键！驱动八~十模块）
  const trendSection = analyzeTrends(dates);
  if (trendSection) {
    lines.push("");
    lines.push(trendSection);
  }

  parts.push(lines.join("\n"));
  return parts.join("\n\n");
}