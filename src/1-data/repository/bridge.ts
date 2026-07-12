/**
 * Bridge Repository — 本地数据桥客户端
 * 映射 MCP 工具名 → 桥 HTTP 端点，桥不可用时回退 MCP
 * 支持动态桥地址：URL参数 ?bridge=xxx 或 localStorage.bridgeUrl
 */
import { getBridgeUrl } from "@infra/config";

/** 获取当前桥地址（运行时动态） */
function getBase(): string {
  return getBridgeUrl();
}

/** 工具名 → 桥端点映射表 */
const TOOL_TO_BRIDGE: Record<string, { path: string; paramMap: (args: Record<string, unknown>) => string }> = {
  kline: {
    path: "/kline",
    paramMap: (args) => `code=${args.code || ""}&count=${args.days || 60}`,
  },
  minute_data: {
    path: "/minute",
    paramMap: (args) => `code=${args.code || ""}`,
  },
  market_overview: {
    path: "/market/overview",
    paramMap: () => "",
  },
  limit_stats: {
    path: "/limit/stats",
    paramMap: () => "",
  },
  limit_up_ladder: {
    path: "/limit/up",
    paramMap: () => "",
  },
  concept_ranking: {
    path: "/concept/ranking",
    paramMap: () => "",
  },
  sector_analysis: {
    path: "/sector/ranking",
    paramMap: () => "",
  },
  capital_flow: {
    path: "/fund/flow",
    paramMap: () => "",
  },
  stock_rank: {
    path: "/limit/up",
    paramMap: () => "",
  },
  valuation_snapshot: {
    path: "/finance/valuation",
    paramMap: (args) => `code=${args.code || ""}`,
  },
  dragon_tiger: {
    path: "/dragon/list",
    paramMap: () => "",
  },
  broken_limit_up: {
    path: "/limit/stats",
    paramMap: () => "",
  },
  limit_down: {
    path: "/limit/stats",
    paramMap: () => "",
  },
  stock_screener: {
    path: "",
    paramMap: () => "",
  },
  stock_search: {
    path: "",
    paramMap: () => "",
  },
  research_reports: {
    path: "",
    paramMap: () => "",
  },
};

/** 将桥 JSON 转为 AI 可读文本 */
function formatBridgeResult(name: string, data: unknown): string {
  const d = data as Record<string, unknown>;
  
  switch (name) {
    case "kline": {
      const bars = (d.data as Array<Record<string, unknown>>) || [];
      if (!bars.length) return "[桥] K线数据为空";
      const last = bars[bars.length - 1]!;
      const first = bars[0]!;
      return `[桥·${d.source || "unknown"}] K线(${bars.length}根): ${first.date}→${last.date} 最新 OHLC: ${last.open}/${last.high}/${last.low}/${last.close} 量:${last.volume}`;
    }
    
    case "minute_data": {
      const pts = (d.data as Array<Record<string, unknown>>) || [];
      if (!pts.length) return "[桥] 分时数据为空";
      const last = pts[pts.length - 1]!;
      return `[桥·${d.source || "unknown"}] 分时(${pts.length}点): 最新价 ${last.price} 时间 ${last.time}`;
    }
    
    case "market_overview": {
      const indices = (d.indices as Array<Record<string, unknown>>) || [];
      const lines = [`[桥] 市场总览: 上涨${d.up || 0}/下跌${d.down || 0}/平盘${d.flat || 0}`];
      for (const idx of indices) {
        const sign = Number(idx.changePercent) >= 0 ? "+" : "";
        lines.push(`  ${idx.name}: ${idx.price} ${sign}${idx.changePercent}%`);
      }
      return lines.join("\n");
    }
    
    case "limit_stats": {
      const up = d.up || 0;
      const down = d.down || 0;
      const broken = d.broken || 0;
      return `[桥·${d.source || "unknown"}] 涨停统计: 涨停${up}只 跌停${down}只 炸板${broken}只 封板率${d.sealRate || 0}%`;
    }
    
    case "limit_up_ladder":
    case "stock_rank": {
      const stocks = (d.data as Array<Record<string, unknown>>) || [];
      if (!stocks.length) return "[桥] 涨停池为空(非交易时间)";
      const top = stocks.slice(0, 20).map((s) => `${s.name}(${s.code}) ${s.changePercent}%`).join(" | ");
      return `[桥] 涨停池(${stocks.length}只): ${top}`;
    }
    
    case "concept_ranking": {
      const items = (d.data as Array<Record<string, unknown>>) || [];
      if (!items.length) return "[桥] 概念排行数据为空";
      const top = items.slice(0, 15).map((c) => `${c.name}(${c.changePercent}%)`).join(" | ");
      return `[桥] 概念排行: ${top}`;
    }
    
    case "sector_analysis": {
      const items = (d.data as Array<Record<string, unknown>>) || [];
      if (!items.length) return "[桥] 板块排行数据为空";
      const top = items.slice(0, 10).map((s) => {
        const inflow = s.mainNetInflow ? ` 净流入${(Number(s.mainNetInflow)/1e8).toFixed(2)}亿` : "";
        return `${s.name}(${s.changePercent}%${inflow})`;
      }).join(" | ");
      return `[桥] 板块排行: ${top}`;
    }
    
    case "capital_flow": {
      if (d.source === "unavailable") return "[桥] 资金流向数据不可用";
      const main = Number(d.mainNetInflow || 0);
      return `[桥] 大盘资金: 主力净流入 ${(main/1e8).toFixed(2)}亿`;
    }
    
    case "valuation_snapshot": {
      if (d.source === "unavailable") return "[桥] 估值数据不可用";
      return `[桥·${d.source}] PE:${d.pe} PB:${d.pb} 市值:${d.marketCap}亿`;
    }
    
    case "dragon_tiger": {
      const items = (d.data as Array<Record<string, unknown>>) || [];
      if (!items.length) return "[桥] 龙虎榜数据不可用(需交易日+代理)";
      return `[桥] 龙虎榜(${items.length}只): ${items.slice(0,5).map((t: Record<string,unknown>) => t.name).join(", ")}`;
    }
    
    case "limit_down": {
      return `[桥] 跌停统计: ${d.down || 0}只跌停`;
    }
    
    case "broken_limit_up": {
      return `[桥] 炸板统计: ${d.broken || 0}只炸板`;
    }
    
    default:
      return `[桥] ${name}: ${JSON.stringify(data).slice(0, 300)}`;
  }
}

/** ngrok 请求头（绕过浏览器警告页） */
function getBridgeHeaders(): Record<string, string> {
  const base = getBase();
  if (base.includes("ngrok")) {
    return { "ngrok-skip-browser-warning": "1" };
  }
  return {};
}

/**
 * 尝试通过本地桥获取数据
 * @returns 格式化文本，或 null 表示桥不可用
 */
export async function fetchFromBridgeTool(name: string, args: Record<string, unknown>): Promise<string | null> {
  const mapping = TOOL_TO_BRIDGE[name];
  if (!mapping || !mapping.path) return null;
  
  try {
    const query = mapping.paramMap(args);
    const url = `${getBase()}${mapping.path}${query ? "?" + query : ""}`;
    
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: getBridgeHeaders(),
    });
    if (!resp.ok) return null;
    
    const json = await resp.json() as unknown;
    return formatBridgeResult(name, json);
  } catch {
    return null;
  }
}

/** 桥可用性检测 */
export async function isBridgeAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${getBase()}/health`, {
      signal: AbortSignal.timeout(3000),
      headers: getBridgeHeaders(),
    });
    if (!resp.ok) return false;
    const json = await resp.json() as { status: string };
    return json.status === "ok";
  } catch {
    return false;
  }
}

/** 桥支持的 MCP 工具名列表 */
export const BRIDGE_SUPPORTED_TOOLS = Object.keys(TOOL_TO_BRIDGE).filter(
  (k) => TOOL_TO_BRIDGE[k]!.path !== ""
);
