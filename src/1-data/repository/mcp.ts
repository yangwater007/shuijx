/**
 * MCP Repository — Wudao Data MCP 工具调用客户端
 * 协议: JSON-RPC 2.0 over HTTP POST
 * 端点: https://stock.quicktiny.cn/api/mcp-stream
 */
import { WUDAO_API_KEY } from "@infra/config";

const MCP_URL = "https://stock.quicktiny.cn/api/mcp-stream";

interface MCPCallResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/** 调用单个 MCP 工具 */
export async function callMCPTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const resp = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + WUDAO_API_KEY,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });

  if (!resp.ok) {
    throw new Error("MCP HTTP " + resp.status);
  }

  const json = (await resp.json()) as {
    result?: MCPCallResult;
    error?: { message: string };
  };

  if (json.error) throw new Error("MCP: " + json.error.message);
  if (!json.result?.content?.[0]?.text) return "";

  return json.result.content[0].text;
}

// ─── OpenAI Function Calling 格式的工具定义 ──────

export interface FunctionDef {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

/** A股分析核心工具集（精选自67个MCP工具） */
export const MCP_FUNCTIONS: FunctionDef[] = [
  {
    name: "market_overview",
    description: "获取全市场涨跌家数、市场温度、昨涨停今日均涨幅。用于复盘开场看市场宽度。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "limit_stats",
    description: "获取实时涨跌停统计：封板数、炸板数、封板率、今日vs昨日对比。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "limit_up_ladder",
    description: "获取实时连板天梯：按连板高度分层展示涨停股，含题材分布。",
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
    description: "获取主力资金流向：大盘主力净流入、板块资金排行。",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "资金流类型: market(大盘) / sector(板块)", enum: ["market", "sector"] },
      },
    },
  },
  {
    name: "sector_analysis",
    description: "获取板块轮动分析数据，含近N日涨幅和资金流向。用于板块轮动复盘。",
    parameters: {
      type: "object",
      properties: {
        period: { type: "string", description: "分析周期: 3d / 5d / 10d / 20d", enum: ["3d", "5d", "10d", "20d"] },
      },
    },
  },
  {
    name: "concept_ranking",
    description: "获取概念板块强度排行，含涨停数和龙头股。用于找主线题材。",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "kline",
    description: "获取个股日K线数据（OHLC+成交量+换手率），支持前复权。",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "股票代码，如 300750" },
        days: { type: "number", description: "天数，默认60" },
        adjust: { type: "string", description: "复权: none(默认) / qfq(前复权)", enum: ["none", "qfq"] },
      },
      required: ["code"],
    },
  },
  {
    name: "minute_data",
    description: "获取个股实时分时走势。盘中专用。",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "股票代码" },
      },
      required: ["code"],
    },
  },
  {
    name: "stock_rank",
    description: "获取实时涨幅榜/跌幅榜/成交额榜。",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", description: "排行类型: gainers / losers / amount", enum: ["gainers", "losers", "amount"] },
        limit: { type: "number", description: "数量，默认10" },
      },
    },
  },
  {
    name: "dragon_tiger_list",
    description: "获取龙虎榜数据：游资席位、净买入额、机构占比。",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "日期(YYYYMMDD)，默认latest" },
      },
    },
  },
  {
    name: "research_reports",
    description: "获取个股研报摘要和评级。",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "股票代码" },
        limit: { type: "number", description: "数量，默认5" },
      },
      required: ["code"],
    },
  },
  {
    name: "valuation_snapshot",
    description: "获取个股估值快照：PE/PB/PS/市值。",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "股票代码" },
      },
      required: ["code"],
    },
  },
  {
    name: "stock_search",
    description: "通过名称/代码/拼音模糊搜索股票。",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "搜索关键词" },
      },
      required: ["keyword"],
    },
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