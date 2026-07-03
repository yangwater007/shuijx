/**
 * AI Repository — DeepSeek 对话 + 新闻/TGB 数据获取
 */

import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from "@infra/config";
import type { NewsItem, KaipanlaItem } from "@infra/types/ai";

// ─── DeepSeek 流式对话 ──────────────────────────

interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/** 调用 DeepSeek API 进行流式对话 */
export async function streamDeepSeekChat(
  messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  model = "deepseek-chat"
): Promise<void> {
  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
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
      throw new Error(`API ${resp.status}: ${errBody.slice(0, 200)}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("无响应流");

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
        } catch (e) { console.warn("api fetch failed:", e); /* 跳过解析失败的行 */ }
      }
    }

    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ─── 新闻/TGB 数据 ─────────────────────────────

/** 获取财联社电报 */
export async function fetchCailianNews(): Promise<NewsItem[]> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/cailian-telegraph");
    if (!resp.ok) return [];
    const json = (await resp.json()) as { error: number; data: NewsItem[] };
    return json.data ?? [];
  } catch (e) { console.warn("api fetch failed:", e);
    return [];
  }
}

/** 获取开盘啦热榜 */
export async function fetchKaipanla(): Promise<KaipanlaItem[]> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/hotlist/kaipanla");
    if (!resp.ok) return [];
    const json = (await resp.json()) as { success: boolean; data: KaipanlaItem[] };
    return json.data ?? [];
  } catch (e) { console.warn("api fetch failed:", e);
    return [];
  }
}

/** 获取第一财经新闻 */
export async function fetchYicaiNews(): Promise<Array<{ id: string; title: string; summary: string; url: string; source: string }>> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/news/yicai");
    if (!resp.ok) return [];
    const json = (await resp.json()) as { success: boolean; data: Array<{ id: string; title: string; summary: string; url: string; source: string }> };
    return json.data ?? [];
  } catch (e) { console.warn("api fetch failed:", e);
    return [];
  }
}

/** 获取连板天梯数据作为上下文 */
export async function fetchBoardLadderForContext(): Promise<string> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/ladder");
    if (!resp.ok) return "";
    const json = await resp.json() as { dateRange: string; dates: Array<{ date: string; dayOfWeek: string; totalStocks: number; pauseRatio: number; boards: Array<{ level: number; stocks: Array<{ name: string; code: string; high_days: string; limit_up_type: string; reason_type: string; primary_theme: string }> }> }> };
    if (!json.dates?.length) return "";

    const latest = json.dates[json.dates.length - 1]!;
    const lines: string[] = [
      `日期: ${latest.date} ${latest.dayOfWeek}`,
      `涨停总数: ${latest.totalStocks}只，炸板率: ${latest.pauseRatio.toFixed(1)}%`,
    ];

    for (const board of latest.boards.sort((a, b) => b.level - a.level)) {
      const stockList = board.stocks.map((s) => `${s.name}(${s.code.slice(0, 3)})`).join("、");
      lines.push(`  ${board.level}连板(${board.stocks.length}只): ${stockList}`);
    }

    return lines.join("\n");
  } catch (e) { console.warn("api fetch failed:", e);
    return "";
  }
}

/** 获取市场概况 */
export async function fetchMarketOverview(): Promise<string> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/market-overview");
    if (!resp.ok) return "";
    const json = await resp.json() as { data?: { upCount?: number; downCount?: number; flatCount?: number; limitUpCount?: number; limitDownCount?: number } };
    if (!json.data) return "";
    const d = json.data;
    return `市场概况: 上涨${d.upCount ?? "?"}家, 下跌${d.downCount ?? "?"}家, 涨停${d.limitUpCount ?? "?"}家, 跌停${d.limitDownCount ?? "?"}家`;
  } catch (e) { console.warn("api fetch failed:", e); return ""; }
}

/** 获取热门板块 */
export async function fetchHotSectors(): Promise<string> {
  try {
    const resp = await fetch("https://stock.quicktiny.cn/api/hot-sectors");
    if (!resp.ok) return "";
    const json = await resp.json() as { data?: Array<{ name: string; changePercent: number; stockCount: number }> };
    if (!json.data?.length) return "";
    const lines = ["热门板块:"];
    for (const s of json.data.slice(0, 10)) {
      const sign = s.changePercent >= 0 ? "+" : "";
      lines.push(`  ${s.name} ${sign}${s.changePercent.toFixed(2)}% (${s.stockCount}只)`);
    }
    return lines.join("\n");
  } catch (e) { console.warn("api fetch failed:", e); return ""; }
}

/** 获取股票排行 */
export async function fetchStockRank(type: string, limit = 10): Promise<string> {
  try {
    const resp = await fetch(`/api/quicktiny/stock-rank?type=${type}&limit=${limit}`);
    if (!resp.ok) return "";
    const json = await resp.json() as { data?: Array<{ name: string; code: string; changePercent: number }> };
    if (!json.data?.length) return "";
    const label = type === "gainers" ? "涨幅榜" : type === "losers" ? "跌幅榜" : "排行";
    const lines = [`${label}:`];
    for (const s of json.data.slice(0, limit)) {
      const sign = s.changePercent >= 0 ? "+" : "";
      lines.push(`  ${s.name}(${s.code}) ${sign}${s.changePercent.toFixed(2)}%`);
    }
    return lines.join("\n");
  } catch (e) { console.warn("api fetch failed:", e); return ""; }
}