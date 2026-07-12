/**
 * MCP Repository — Wudao Data MCP 工具调用客户端
 * 协议: JSON-RPC 2.0 over HTTP POST
 */
import { WUDAO_API_KEY } from "@infra/config";

const MCP_URL = "https://stock.quicktiny.cn/api/mcp-stream";

/** 调用单个 MCP 工具 */
// ????? + ??????
const _cache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30??
const DAILY_LIMIT = 50;

function _getTodayKey(): string {
  return "mcp_quota_" + new Date().toISOString().slice(0, 10);
}
function _getCallCount(): number {
  try { const v = localStorage.getItem(_getTodayKey()); return v ? parseInt(v, 10) : 0; } catch { return 0; }
}
function _incrCallCount(): number {
  const c = _getCallCount() + 1;
  try { localStorage.setItem(_getTodayKey(), String(c)); } catch { /* */ }
  return c;
}
function _cacheKey(name: string, args: Record<string, unknown>): string {
  return name + "::" + JSON.stringify(args);
}

/** ???? MCP ???????????????? */
export async function callMCPTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const key = _cacheKey(name, args);
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.text;

  const count = _incrCallCount();
  if (count > DAILY_LIMIT) {
    console.warn("[MCP] ????????????????");
    if (cached) return cached.text;
    return "[?????] ??MCP????" + DAILY_LIMIT + "???????";
  }

  try {
    const resp = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + WUDAO_API_KEY },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }),
    });
    if (!resp.ok) throw new Error("MCP HTTP " + resp.status);
    const json = (await resp.json()) as { result?: { content: Array<{ type: string; text: string }> }; error?: { message: string } };
    if (json.error) throw new Error("MCP: " + json.error.message);
    const text = json.result?.content?.[0]?.text ?? "";
    _cache.set(key, { text, ts: Date.now() });
    if (count >= DAILY_LIMIT * 0.8) {
      console.warn("[MCP] ???? " + count + "/" + DAILY_LIMIT + "??? " + (DAILY_LIMIT - count) + " ?");
    }
    return text;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (errMsg.includes("??")) {
      _cache.set(key, { text: "[?????]", ts: Date.now() + CACHE_TTL });
    }
    throw e;
  }
}

/** ???????MCP???? */
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__mcpResetQuota = () => {
    try { localStorage.removeItem(_getTodayKey()); console.log("[MCP] ???????"); } catch { /* */ }
  };
  (window as unknown as Record<string, unknown>).__mcpQuotaLeft = () => {
    const used = _getCallCount();
    console.log("[MCP] ?? " + used + "/" + DAILY_LIMIT + "??? " + Math.max(0, DAILY_LIMIT - used));
  };
}

export interface FunctionDef {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, { type: string; description: string; enum?: (string|number)[] }>; required?: string[] };
}

/** A股分析核心工具集（名称和参数严格对齐 MCP 后端） */
export const MCP_FUNCTIONS: FunctionDef[] = [
  {
    name: "market_overview",
    description: "获取全市场涨跌家数、市场温度、昨涨停今日均涨幅。复盘开场必调。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "limit_stats",
    description: "获取实时涨跌停统计：封板数、炸板数、封板率、今日vs昨日对比。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "limit_up_ladder",
    description: "获取实时连板天梯：按连板高度分层展示涨停股，含题材分布和晋级路径。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "broken_limit_up",
    description: "获取当日炸板股列表，含最高封单和开板次数。判断市场分歧。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "limit_down",
    description: "获取当日跌停股池，识别恐慌情绪。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "capital_flow",
    description: "获取资金流向：不带参数返回大盘主力净流入；带 type='sector' 返回板块资金排行。",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "sector 返回板块资金排行", enum: ["sector"] },
      },
    },
  },
  {
    name: "sector_analysis",
    description: "板块轮动分析：无参数返回持续强势/低位启动/高位走弱板块；可选 source(ths), period(天数), strengthPeriod(3|5|10)",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", description: "数据源，默认ths", enum: ["ths"] },
        period: { type: "number", description: "分析周期(天)" },
        strengthPeriod: { type: "number", description: "强度周期(天)，可选3/5/10", enum: [3, 5, 10] },
      },
    },
  },
  {
    name: "concept_ranking",
    description: "获取概念板块强度排行，含涨停数和龙头股。找主线题材。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "kline",
    description: "获取个股日K线（OHLC+成交量+换手率），支持前复权qfq。",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "股票代码，如300750" },
        days: { type: "number", description: "天数，默认60" },
        adjust: { type: "string", description: "复权：none(默认)/qfq(前复权)", enum: ["none", "qfq"] },
      },
      required: ["code"],
    },
  },
  {
    name: "minute_data",
    description: "获取个股实时分时走势。盘中专用。",
    parameters: { type: "object", properties: { code: { type: "string", description: "股票代码" } }, required: ["code"] },
  },
  {
    name: "stock_rank",
    description: "获取实时涨幅榜/跌幅榜/成交额榜。type: gainers/losers/amount",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "gainers/losers/amount", enum: ["gainers", "losers", "amount"] },
        limit: { type: "number", description: "数量，默认10" },
      },
    },
  },
  {
    name: "dragon_tiger",
    description: "龙虎榜买卖席位详情。支持按游资名(branchSearch)或股票代码(stockCode)查询。",
    parameters: {
      type: "object",
      properties: {
        stockCode: { type: "string", description: "股票代码" },
        branchSearch: { type: "string", description: "游资/营业部名称" },
        startDate: { type: "string", description: "开始日期(YYYYMMDD)" },
        endDate: { type: "string", description: "结束日期(YYYYMMDD)" },
      },
    },
  },
  {
    name: "research_reports",
    description: "获取个股研报摘要和评级。",
    parameters: {
      type: "object",
      properties: { code: { type: "string", description: "股票代码" }, limit: { type: "number", description: "数量，默认5" } },
      required: ["code"],
    },
  },
  {
    name: "valuation_snapshot",
    description: "获取个股估值快照：PE/PB/PS/市值。",
    parameters: { type: "object", properties: { code: { type: "string", description: "股票代码" } }, required: ["code"] },
  },
  {
    name: "stock_search",
    description: "通过名称/代码/拼音模糊搜索股票。",
    parameters: { type: "object", properties: { keyword: { type: "string", description: "搜索关键词" } }, required: ["keyword"] },
  },
  {
    name: "limit_bigloser",
    description: "?????(????>10%??)????(??????????)????????",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "limit_yesterday_premium",
    description: "??????????,??????????????????????:???????,?????????",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "stock_screener",
    description: "多维度筛选股票（市值/市盈率/涨跌幅/换手率等）。",
    parameters: {
      type: "object",
      properties: {
        pct_change_min: { type: "number", description: "最小涨跌幅" },
        turnover_min: { type: "number", description: "最小换手率" },
        limit: { type: "number", description: "数量，默认20" },
      },
    },
  },
];