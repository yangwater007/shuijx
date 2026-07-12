/**
 * AI Repository — DeepSeek 对话 + MCP工具调用 + 市场上下文
 * 数据源: quicktiny ladder + 同花顺 + MCP(Wudao Data)
 */
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from "@infra/config";
import type { NewsItem, KaipanlaItem } from "@infra/types/ai";
import { MCP_FUNCTIONS, type FunctionDef } from "@data/repository/mcp";
import { fetchFromBridgeTool } from "@data/repository/bridge";

// ─── 流式回调类型 ──────────────────────────────

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onReasoning: (token: string) => void;
  onFunctionCall: (call: { name: string; arguments: string }) => void;
  onDone: (finishReason?: string) => void;
  onError: (err: Error) => void;
}

// ─── DeepSeek 流式对话（含 function calling + reasoning） ──

export async function streamDeepSeekChat(
  messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  model = "deepseek-chat",
  functions?: FunctionDef[],
  options?: { temperature?: number }
): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: 4096,
    };

    // 附加 function calling
    if (functions && functions.length > 0) {
      body.tools = functions.map((f) => ({
        type: "function",
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        },
      }));
      body.tool_choice = "auto";
    }

    const resp = await fetch(DEEPSEEK_BASE_URL + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + DEEPSEEK_API_KEY,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!resp.ok) {
      const eb = await resp.text().catch(() => "");
      throw new Error("API " + resp.status + ": " + eb.slice(0, 200));
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No stream");

    const decoder = new TextDecoder();
    let buffer = "";
    // 累积 function_call 增量
    let fcName = "";
    let fcArgs = "";
    let fcIndex = -1;

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
            choices?: Array<{
              delta?: {
                content?: string;
                reasoning_content?: string;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string;
            }>;
          };

          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // 思维链
          if (delta.reasoning_content) {
            callbacks.onReasoning(delta.reasoning_content);
          }

          // 文本内容
          if (delta.content) {
            callbacks.onToken(delta.content);
          }

          // 函数调用
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined && tc.index !== fcIndex) {
                // 新工具调用
                if (fcName) {
                  callbacks.onFunctionCall({ name: fcName, arguments: fcArgs });
                }
                fcIndex = tc.index;
                fcName = tc.function?.name ?? "";
                fcArgs = tc.function?.arguments ?? "";
              } else {
                if (tc.function?.name) fcName += tc.function.name;
                if (tc.function?.arguments) fcArgs += tc.function.arguments;
              }
            }
          }

          // 完成
          const finishReason = parsed.choices?.[0]?.finish_reason;
          if (finishReason) {
            // 如果有未完成的 function_call，发送
            if (fcName && (finishReason === "tool_calls" || finishReason === "stop")) {
              callbacks.onFunctionCall({ name: fcName, arguments: fcArgs });
            }
            callbacks.onDone(finishReason);
          }
        } catch { /* skip */ }
      }
    }

    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ─── MCP 工具执行 ──────────────────────────────

export async function executeToolCall(
  name: string,
  argsStr: string
): Promise<string> {
  try {
    const args = argsStr ? (JSON.parse(argsStr) as Record<string, unknown>) : {};
    // local bridge - only data source (free, no rate limit)
    const bridgeResult = await fetchFromBridgeTool(name, args);
    if (bridgeResult !== null) return bridgeResult;

    // bridge unavailable
    return "[bridge] local data bridge unavailable, please start ths_bridge_v3.py (port 8765)";
  } catch (err) {
    return "[tool call failed] " + (err instanceof Error ? err.message : String(err));
  }
}

export { MCP_FUNCTIONS };

// ─── 新闻/热榜 ──────────────────────────────────

export async function fetchCailianNews(): Promise<NewsItem[]> {
  try { const r = await fetch("https://stock.quicktiny.cn/api/cailian-telegraph"); if (!r.ok) return []; const j = await r.json() as { error: number; data: NewsItem[] }; return j.data ?? []; } catch { return []; }
}
export async function fetchKaipanla(): Promise<KaipanlaItem[]> {
  try { const r = await fetch("https://stock.quicktiny.cn/api/hotlist/kaipanla"); if (!r.ok) return []; const j = await r.json() as { success: boolean; data: KaipanlaItem[] }; return j.data ?? []; } catch { return []; }
}

// ─── 同花顺 大盘指数 ──────────────────────────

interface IndexQuote {
  name: string; price: number; changePercent: number;
  open: number; high: number; low: number; preClose: number;
  amount: number; upCount: number; downCount: number; flatCount: number;
}

function parseTHSRealhead(raw: string): Record<string, string> | null {
  try { const s = raw.indexOf("({"); if (s === -1) return null; const j = raw.slice(s + 1, raw.lastIndexOf(")")); const p = JSON.parse(j) as { items: Record<string, string> }; return p.items ?? null; } catch { return null; }
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
    return {
      name: items["name"] ?? "", price, changePercent: changePct,
      open: parseFloat(items["7"] ?? "0"), high: parseFloat(items["8"] ?? "0"),
      low: parseFloat(items["9"] ?? "0"), preClose,
      amount: parseFloat(items["19"] ?? "0"),
      upCount: parseInt(items["38"] ?? "0"), downCount: parseInt(items["37"] ?? "0"), flatCount: parseInt(items["39"] ?? "0"),
    };
  } catch { return null; }
}

async function fetchMarketOverview(): Promise<string> {
  const results = await Promise.allSettled([fetchTHSIndex("hs_1A0001"), fetchTHSIndex("sz_399001"), fetchTHSIndex("sz_399006")]);
  const names = ["上证指数", "深证成指", "创业板指"];
  const lines: string[] = ["=== 大盘指数（同花顺实时） ==="];
  let totalAmount = 0, totalUp = 0, totalDown = 0, totalFlat = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r && r.status === "fulfilled" && r.value) {
      const q = r.value; const sign = q.changePercent >= 0 ? "+" : "";
      lines.push(q.name + ": " + q.price.toFixed(2) + " " + sign + q.changePercent.toFixed(2) + "%" +
        " 开" + q.open.toFixed(2) + " 高" + q.high.toFixed(2) + " 低" + q.low.toFixed(2) + " 昨收" + q.preClose.toFixed(2) +
        " 成交" + (q.amount >= 1e12 ? (q.amount / 1e12).toFixed(2) + "万亿" : (q.amount / 1e8).toFixed(0) + "亿"));
      totalAmount += q.amount; totalUp += q.upCount; totalDown += q.downCount; totalFlat += q.flatCount;
    } else { lines.push(names[i] + ": 获取失败"); }
  }
  if (totalAmount > 0) lines.push("两市合计: " + (totalAmount >= 1e12 ? (totalAmount / 1e12).toFixed(2) + "万亿" : (totalAmount / 1e8).toFixed(0) + "亿"));
  if (totalUp + totalDown + totalFlat > 0) {
    lines.push("涨跌家数: 涨" + totalUp + "/跌" + totalDown + "/平" + totalFlat +
      " (涨跌比 " + (totalDown > 0 ? (totalUp / totalDown).toFixed(2) : "0") + ":1)" +
      (totalUp > totalDown * 1.5 ? " 普涨" : totalDown > totalUp * 1.5 ? " 普跌" : " 分化"));
  }
  return lines.join("\n");
}

// ─── 涨停数据(static) ──────────────────────────

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
  const lines: string[] = ["=== 关键趋势信号 ==="];
  const tD = latest.totalStocks - prev.totalStocks;
  lines.push("涨停变化: " + (tD >= 0 ? "+" : "") + tD + " (" + prev.totalStocks + "->" + latest.totalStocks + ")" + (tD > 10 ? " 回暖" : tD < -10 ? " 降温" : ""));
  const pD = latest.pauseRatio - prev.pauseRatio;
  lines.push("炸板率变化: " + (pD >= 0 ? "+" : "") + pD.toFixed(1) + "%" + (pD > 5 ? " 风险！" : pD < -5 ? " 积极" : ""));
  const lMax = latest.boards[0]?.level ?? 0, pMax = prev.boards[0]?.level ?? 0;
  lines.push("连板高度: " + lMax + "板" + (pMax > 1 ? " (昨:" + pMax + ")" : "") + (lMax > pMax ? " 打开" : lMax < pMax ? " 压缩" : ""));
  const tHi = latest.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
  const pHi = prev.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
  lines.push("高位股(>=3): " + tHi.length + "只 (昨:" + pHi.length + ")" + (tHi.length > pHi.length ? " 扩容" : ""));
  const tcodes = new Set(latest.boards.flatMap((b) => b.stocks).map((s) => s.code));
  const broken = prev.boards.flatMap((b) => b.stocks).filter((s) => s.continue_num >= 2 && !tcodes.has(s.code));
  if (broken.length) lines.push("断板高位: " + broken.slice(0, 5).map((s) => s.name + "(" + s.continue_num + "板)").join("、") + (broken.length > 5 ? "等" : ""));
  if (prev2) {
    lines.push("三日涨停: " + [prev2.totalStocks, prev.totalStocks, latest.totalStocks].join("->") + " (" + (latest.totalStocks > prev2.totalStocks ? "上升" : "下降") + ")");
    lines.push("三日炸板率: " + [prev2.pauseRatio, prev.pauseRatio, latest.pauseRatio].map((p) => p.toFixed(1) + "%").join("->") + " (" + (latest.pauseRatio > prev2.pauseRatio ? "恶化" : "改善") + ")");
  }
  let risk = "低"; const reasons: string[] = [];
  if (latest.pauseRatio > 35) { risk = "高"; reasons.push("炸板>35%"); }
  else if (latest.pauseRatio > 25) { risk = "中"; reasons.push("炸板>25%"); }
  if (lMax <= 3) { risk = risk === "高" ? "高" : "中"; reasons.push("高度<=3"); }
  if (latest.totalStocks < 30) { risk = "高"; reasons.push("涨停<30"); }
  if (broken.length >= 5) reasons.push("断板>=5");
  lines.push("风险等级: " + risk + (reasons.length ? " (" + reasons.join(";") + ")" : ""));
  return lines.join("\n");
}


/** 3?????????????????????????? */

export async function fetchBoardLadderForContext(): Promise<string> {
  const [ladderResult, overviewResult] = await Promise.allSettled([
    (async () => { try { const r = await fetch("https://stock.quicktiny.cn/api/ladder"); if (!r.ok) return null; return await r.json() as RawApiResponse; } catch { return null; } })(),
    fetchMarketOverview(),
  ]);
  const parts: string[] = [];
  if (overviewResult.status === "fulfilled" && overviewResult.value) parts.push(overviewResult.value);

  // pre-fetch all core data via Bridge (no MCP, no AI tool-calling needed)
  const [loserData, limitDownData, bigloserData, premiumData, conceptData, flowData, historyData] = await Promise.all([
    fetchFromBridgeTool("stock_rank", { type: "losers", limit: 20 }),
    fetchFromBridgeTool("limit_down", {}),
    fetchFromBridgeTool("limit_bigloser", {}),
    fetchFromBridgeTool("limit_yesterday_premium", {}),
    fetchFromBridgeTool("concept_ranking", {}),
    fetchFromBridgeTool("capital_flow", {}),
    (async () => { try { const r = await fetch(getBridgeUrl() + "/review/history?days=20"); if (!r.ok) return null; const j = await r.json(); return "=== 20????? ===\n" + (j.days || []).map((d: {date:string;upCount:number;downCount:number;avgChange:number}) => d.date + " ??" + d.upCount + " ??" + d.downCount + " ??" + d.avgChange + "%").join("\n"); } catch { return null; } })(),
  ]);

  // inject pre-fetched data into context
  if (loserData && !loserData.includes("unavailable")) parts.push("=== ??? ===\n" + loserData.slice(0, 800));
  if (limitDownData && !limitDownData.includes("unavailable")) parts.push("=== ??? ===\n" + limitDownData.slice(0, 600));
  if (bigloserData && !bigloserData.includes("unavailable")) parts.push("=== ???+??? ===\n" + bigloserData.slice(0, 800));
  if (premiumData && !premiumData.includes("unavailable")) parts.push("=== ????? ===\n" + premiumData.slice(0, 400));
  if (conceptData && !conceptData.includes("unavailable")) parts.push("=== ???? ===\n" + conceptData.slice(0, 600));
  if (flowData && !flowData.includes("unavailable")) parts.push("=== ???? ===\n" + flowData.slice(0, 400));
  if (historyData && typeof historyData === "string") parts.push(historyData);

  const json = ladderResult.status === "fulfilled" ? ladderResult.value : null;
  if (!json?.dates?.length) return parts.length > 0 ? parts.join("\n\n") : "";

  const dates = json.dates;
  const today = dates[dates.length - 1]!;
  const yesterday = dates.length >= 2 ? dates[dates.length - 2] : null;
  const dayBefore = dates.length >= 3 ? dates[dates.length - 3] : null;
  const lines: string[] = [];

  lines.push("=== ?????? ===");
  lines.push("??: " + today.date + " " + today.dayOfWeek + (yesterday ? " ?:" + yesterday.date : ""));
  lines.push("??: " + today.totalStocks + "?" + (yesterday ? " (?:" + yesterday.totalStocks + ")" : "") + " ???:" + today.pauseRatio.toFixed(1) + "%");
  const est = today.totalStocks / Math.max(0.01, 1 - today.pauseRatio / 100);
  lines.push("??(?):" + Math.round(est) + " ??(?):" + Math.round(est - today.totalStocks) + " ???:" + (100 - today.pauseRatio).toFixed(1) + "%");

  function sbn(d: RawApiDate, n: number) { return d.boards.flatMap((b) => b.stocks).filter((s) => s.continue_num === n); }
  if (yesterday) {
    const y1 = sbn(yesterday, 1), t2 = sbn(today, 2);
    const r12 = y1.length > 0 ? (t2.length / y1.length * 100) : 0;
    lines.push("1?2:" + r12.toFixed(1) + "%(" + t2.length + "/" + y1.length + ")" + (r12 >= 25 ? "?" : r12 >= 15 ? "?" : "?"));
    const y2 = sbn(yesterday, 2), t3 = sbn(today, 3);
    const r23 = y2.length > 0 ? (t3.length / y2.length * 100) : 0;
    lines.push("2?3:" + r23.toFixed(1) + "%(" + t3.length + "/" + y2.length + ")" + (r23 >= 30 ? "?" : r23 >= 20 ? "?" : "?"));
    const yHi = yesterday.boards.filter((b) => b.level >= 3).flatMap((b) => b.stocks);
    const tHi2 = today.boards.filter((b) => b.level >= 4).flatMap((b) => b.stocks);
    const hr = yHi.length > 0 ? (tHi2.length / yHi.length * 100) : 0;
    lines.push("????:" + hr.toFixed(1) + "%(" + tHi2.length + "/" + yHi.length + ")");
  }

  const sorted = [...today.boards].sort((a, b) => b.level - a.level);
  for (const b of sorted) {
    const d = b.stocks.map((s) => s.name + "(" + s.code.slice(0, 3) + ")[" + s.primary_theme + "] ??" + s.turnover_rate.toFixed(1) + "% " + s.limit_up_type + " " + (s.reason_info || "")).join(" / ");
    lines.push(b.level + "?(" + b.stocks.length + "?): " + d);
  }

  const flatT = today.boards.flatMap((b) => b.stocks);
  const tm = new Map<string, { stocks: RawApiStock[] }>();
  for (const s of flatT) { const t = s.primary_theme || s.industry || "??"; const e = tm.get(t) || { stocks: [] }; e.stocks.push(s); tm.set(t, e); }
  const st = [...tm.entries()].sort((a, b) => b[1].stocks.length - a[1].stocks.length);
  lines.push("????:");
  for (const [theme, data] of st) {
    const c = data.stocks.length; const top = data.stocks[0]!;
    lines.push("  " + theme + " " + (c >= 15 ? "[?]" : c >= 5 ? "[?]" : "[?]") + " " + c + "? ??:" + top.name + "(" + top.continue_num + "?)" + (c > 1 ? " ??:" + data.stocks.slice(1, 4).map((s) => s.name).join(",") : ""));
  }

  lines.push(""); lines.push("=== ???? ===");
  const dc = (d: RawApiDate | null, fn: (d: RawApiDate) => string) => d ? fn(d) : "-";
  lines.push("?? " + dc(dayBefore, (d) => d.date) + " / " + dc(yesterday, (d) => d.date) + " / " + today.date);
  lines.push("?? " + dc(dayBefore, (d) => String(d.totalStocks)) + " / " + dc(yesterday, (d) => String(d.totalStocks)) + " / " + today.totalStocks);
  lines.push("??? " + dc(dayBefore, (d) => d.pauseRatio.toFixed(1) + "%") + " / " + dc(yesterday, (d) => d.pauseRatio.toFixed(1) + "%") + " / " + today.pauseRatio.toFixed(1) + "%");
  lines.push("?? " + dc(dayBefore, (d) => String(d.boards[0]?.level ?? 0)) + " / " + dc(yesterday, (d) => String(d.boards[0]?.level ?? 0)) + " / " + String(sorted[0]?.level ?? 0));

  const total = today.totalStocks, ml = sorted[0]?.level ?? 0;
  let stage = "???";
  if (total < 30 && today.pauseRatio > 40) stage = "???";
  else if (total >= 30 && total < 50 && yesterday && total > yesterday.totalStocks && today.pauseRatio < yesterday.pauseRatio) stage = "???";
  else if (total >= 50 && total < 80 && ml >= 4) stage = "???";
  else if (total >= 80 && total < 100) stage = "???";
  else if (total >= 100 && ml >= 7) stage = "???";
  else if (yesterday && total < yesterday.totalStocks && today.pauseRatio > yesterday.pauseRatio) stage = "???";
  else if (yesterday && today.pauseRatio > 35) stage = "???";
  lines.push("??: " + stage);

  const trend = analyzeTrends(dates);
  if (trend) { lines.push(""); lines.push(trend); }

  return parts.join("\n\n");
}