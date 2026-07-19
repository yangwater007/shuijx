import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://qzqpymvboltyvddpmpct.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; // set SUPABASE_SERVICE_ROLE_KEY env var

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// === Types ===
interface ToolContext {
  supabase: typeof supabase;
  args: Record<string, unknown>;
}
interface ToolDef {
  description: string;
  handler: (ctx: ToolContext) => Promise<string>;
}

// === Helpers ===
async function lastTradeDate(): Promise<string | null> {
  const { data } = await supabase
    .from("daily_kline").select("trade_date").order("trade_date", { ascending: false }).limit(1);
  return data?.[0]?.trade_date ?? null;
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ==== BEGIN Tools ====

// === Market Tools ===
const MARKET_TOOLS: Record<string, ToolDef> = {
  market_overview: {
    description: "[市场] 获取全市场概况(上证/深证/创业板/科创50)",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate() ?? todayStr();
      const { data: rows } = await supabase.rpc("get_market_overview", { trade_date: dt });
      const { data: upDown } = await supabase
        .from("daily_kline").select("change_pct", { count: "exact" }).eq("trade_date", dt);
      const up = upDown?.filter((r) => r.change_pct > 0).length ?? 0;
      const down = upDown?.filter((r) => r.change_pct < 0).length ?? 0;
      const flat = (upDown?.length ?? 0) - up - down;
      let lines = [`=== A股概况 (${dt}) ===`, `上涨 ${up}家 / 下跌 ${down}家 / 平盘 ${flat}家`];
      for (const row of (rows ?? [])) {
        const sign = (row.change_pct ?? 0) >= 0 ? "+" : "";
        lines.push(`${row.name}: ${Number(row.price).toFixed(2)} ${sign}${Number(row.change_pct).toFixed(2)}% O${Number(row.open).toFixed(2)} H${Number(row.high).toFixed(2)} L${Number(row.low).toFixed(2)}`);
      }
      return lines.join("\n");
    },
  },
  kline: {
    description: "[个股] 获取日K线(OHLC+成交量+涨跌幅)", args: "code,days,adjust",
    handler: async ({ supabase, args }) => {
      const code = (args.code as string) || "";
      const days = Number(args.days) || 60;
      if (!code) return "[kline] 请提供股票代码";
      const { data, error } = await supabase
        .from("daily_kline").select("*").eq("code", code).order("trade_date", { ascending: false }).limit(days);
      if (error) return `[kline] 查询失败: ${error.message}`;
      if (!data?.length) return `[kline] 未找到 ${code} 的K线数据`;
      const bars = data.reverse();
      const first = bars[0], last = bars[bars.length - 1];
      let lines = [
        `[Supabase] K线 ${code}: ${bars.length}条 (${first.trade_date} -> ${last.trade_date})`,
        "日期     开盘   最高   最低   收盘   成交量     涨跌幅",
      ];
      for (const b of bars.slice(-30)) {
        lines.push(`${b.trade_date} ${Number(b.open).toFixed(2).padStart(7)} ${Number(b.high).toFixed(2).padStart(7)} ${Number(b.low).toFixed(2).padStart(7)} ${Number(b.close).toFixed(2).padStart(7)} ${String(b.volume).padStart(10)} ${Number(b.change_pct ?? 0).toFixed(2).padStart(7)}%`);
      }
      return lines.join("\n");
    },
  },
  minute_data: {
    description: "[个股] 获取分时数据(价格+均价)", args: "code",
    handler: async ({ supabase, args }) => {
      const code = (args.code as string) || "";
      if (!code) return "[minute] 请提供股票代码";
      const dt = await lastTradeDate();
      const { data } = await supabase
        .from("realtime_timeshare").select("*").eq("code", code).eq("trade_date", dt).order("time", { ascending: true }).limit(242);
      if (!data?.length) return `[minute] 未找到 ${code} 的分时数据`;
      const lines = [`[Supabase] ${code} 分时数据 (${dt}): ${data.length}条`];
      for (const p of data) lines.push(`${p.time} ${Number(p.price).toFixed(2)}`);
      return lines.join("\n");
    },
  },
  stock_rank: {
    description: "[排行] 涨幅/跌幅/成交额排行", args: "type(gainers/losers/amount),limit",
    handler: async ({ supabase, args }) => {
      const type = (args.type as string) || "gainers";
      const limit = Number(args.limit) || 10;
      const dt = await lastTradeDate();
      let orderCol = "change_pct", ascending = false, label = "涨幅";
      if (type === "losers") { ascending = true; label = "跌幅"; }
      else if (type === "amount") { orderCol = "amount"; label = "成交额"; }
      const { data } = await supabase
        .from("daily_kline").select("code, change_pct, amount").eq("trade_date", dt).order(orderCol, { ascending }).limit(limit);
      if (!data?.length) return "[排行] 暂无数据";
      return [`=== ${label}榜 TOP${limit} (${dt}) ===`].concat(
        data.map((r, i) => `${i + 1}. ${r.code} ${type === "amount" ? (Number(r.amount) / 1e8).toFixed(2) + "亿" : Number(r.change_pct ?? 0).toFixed(2) + "%"}`)
      ).join("\n");
    },
  },
  valuation_snapshot: {
    description: "[估值] 股票估值快照: PE/PB/行业/上市日期", args: "code",
    handler: async ({ supabase, args }) => {
      const code = (args.code as string) || "";
      if (!code) return "[估值] 请提供股票代码";
      const { data } = await supabase.from("base_stocks").select("*").eq("code", code).limit(1);
      if (!data?.length) return `[估值] 未找到 ${code}`;
      const s = data[0];
      return [`[Supabase] ${s.code} ${s.name}`, `行业: ${s.industry || "未知"}`, `上市日期: ${s.list_date || "未知"}`, `ST: ${s.is_st ? "是" : "否"}`].join("\n");
    },
  },
};

// === Limit Tools ===
const LIMIT_TOOLS: Record<string, ToolDef> = {
  limit_stats: {
    description: "[涨停] 涨停统计: 涨停数量/跌停数/炸板数",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate();
      if (!dt) return "[涨停统计] 无数据";
      const { count: up } = await supabase.from("daily_kline").select("*", { count: "exact", head: true }).eq("trade_date", dt).gte("change_pct", 9.8);
      const { count: down } = await supabase.from("daily_kline").select("*", { count: "exact", head: true }).eq("trade_date", dt).lte("change_pct", -9.8);
      const { count: broken } = await supabase.from("daily_limit_up").select("*", { count: "exact", head: true }).eq("trade_date", dt).gt("open_count", 0);
      const sealRate = (up ?? 0) + (broken ?? 0) > 0 ? (((up ?? 0) / ((up ?? 0) + (broken ?? 0))) * 100).toFixed(1) : "0";
      return [`[Supabase] ${dt} 涨停统计:`, `涨停: ${up ?? 0}家 | 跌停: ${down ?? 0}家 | 炸板: ${broken ?? 0}家`, `封板率: ${sealRate}%`].join("\n");
    },
  },
  limit_up_ladder: {
    description: "[连板] 连板天梯: 按连板数分组展示涨停股+原因+换手",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate();
      if (!dt) return "[连板天梯] 无数据";
      const { data } = await supabase
        .from("daily_limit_up").select("code, name:base_stocks!inner(name), continue_num, change_pct, turnover_rate, reason_type, reason_info").eq("trade_date", dt).order("continue_num", { ascending: false }).limit(50);
      if (!data?.length) return "[连板天梯] 当日无涨停股票";
      const byLevel = new Map<number, string[]>();
      for (const s of data) {
        const n = s.continue_num ?? 1;
        if (!byLevel.has(n)) byLevel.set(n, []);
        const name = (s as any).name?.name ?? s.code;
        byLevel.get(n)!.push(`${name}(${s.code}) ${s.change_pct}% 换${((s.turnover_rate ?? 0) as number).toFixed(1)}% ${s.reason_info || ""}`);
      }
      const lines: string[] = [`=== 连板天梯 (${dt}) ===`, `总数: ${data.length}家`];
      for (const [level, stocks] of [...byLevel.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))) {
        lines.push(`${level}板 (${stocks.length}只): ${stocks.join(" | ")}`);
      }
      return lines.join("\n");
    },
  },
  broken_limit_up: {
    description: "[炸板] 炸板股票: 触及涨停后打开的股票",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate();
      if (!dt) return "[炸板] 无数据";
      const { data } = await supabase
        .from("daily_limit_up").select("code, name:base_stocks!inner(name), open_count, change_pct, reason_info").eq("trade_date", dt).gt("open_count", 0).order("open_count", { ascending: false });
      if (!data?.length) return "[炸板] 今日无炸板";
      return [`=== 炸板 (${dt}) ===`].concat(
        data.map((s, i) => `${i + 1}. ${(s as any).name?.name ?? s.code}(${s.code}) 炸${s.open_count}次 ${s.change_pct}% ${s.reason_info || ""}`)
      ).join("\n");
    },
  },
  limit_down: {
    description: "[跌停] 跌停列表: 当日跌停股票",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate();
      if (!dt) return "[跌停] 无数据";
      const { data } = await supabase
        .from("daily_kline").select("code, change_pct, turnover").eq("trade_date", dt).lte("change_pct", -9.8).order("change_pct", { ascending: true }).limit(30);
      if (!data?.length) return "[跌停] 今日无跌停";
      return [`=== 跌停 (${dt}) ===`].concat(
        data.map((s, i) => `${i + 1}. ${s.code} ${s.change_pct}% 换手${((s.turnover ?? 0) as number).toFixed(1)}%`)
      ).join("\n");
    },
  },
  limit_bigloser: {
    description: "[大面] 大面股(跌幅>10%)+核按钮(昨日涨停今日跌停)",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate();
      if (!dt) return "[大面] 无数据";
      const { data: bigLosers } = await supabase
        .from("daily_kline").select("code, name:base_stocks!inner(name), change_pct").eq("trade_date", dt).lte("change_pct", -10).order("change_pct", { ascending: true });
      const { data: yesterdayUp } = await supabase
        .from("daily_limit_up").select("code, trade_date").lt("trade_date", dt).order("trade_date", { ascending: false }).limit(1);
      let nuclearLines: string[] = [];
      if (yesterdayUp?.length) {
        const yesterdayDt = yesterdayUp[0].trade_date;
        const { data: yestCodes } = await supabase.from("daily_limit_up").select("code").eq("trade_date", yesterdayDt);
        const codes = yestCodes?.map((r) => r.code) ?? [];
        if (codes.length) {
          const { data: nuclear } = await supabase
            .from("daily_kline").select("code, name:base_stocks!inner(name), change_pct").eq("trade_date", dt).lte("change_pct", -9.8).in("code", codes);
          nuclearLines = (nuclear ?? []).map((s, i) => `${i + 1}. ${(s as any).name?.name ?? s.code}(${s.code}) ${s.change_pct}%`);
        }
      }
      return JSON.stringify({
        bigLosers: (bigLosers ?? []).map((s) => ({ code: s.code, name: (s as any).name?.name ?? s.code, changePercent: Number(s.change_pct ?? 0) })),
        nuclearButtons: nuclearLines.map((l) => ({ changePercent: 0, code: "", name: l })),
        tradeDate: dt,
      }, null, 2);
    },
  },
  limit_yesterday_premium: {
    description: "[溢价] 昨日涨停溢价率: 昨日涨停股今日平均涨幅",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate();
      if (!dt) return "[溢价] 无数据";
      const { data: yestRow } = await supabase
        .from("daily_kline").select("trade_date").lt("trade_date", dt).order("trade_date", { ascending: false }).limit(1);
      const yesterday = yestRow?.[0]?.trade_date;
      if (!yesterday) return "[溢价] 无昨日数据";
      const { data: yestCodes } = await supabase.from("daily_limit_up").select("code").eq("trade_date", yesterday);
      if (!yestCodes?.length) return "[溢价] 昨日无涨停";
      const codes = yestCodes.map((r) => r.code);
      const { data: today } = await supabase.from("daily_kline").select("change_pct").eq("trade_date", dt).in("code", codes);
      if (!today?.length) return "[溢价] 今日无数据";
      const rets = today.map((r) => Number(r.change_pct ?? 0));
      const avg = (rets.reduce((a, b) => a + b, 0) / rets.length).toFixed(2);
      return `[昨日涨停溢价] ${yesterday}涨停${codes.length}只 -> 今日平均${avg}% (${rets.length}只有效数据) | ${Number(avg) >= 2 ? "强" : Number(avg) >= 0 ? "平" : "弱"}`;
    },
  },
};

// === Capital Tools ===
const CAPITAL_TOOLS: Record<string, ToolDef> = {
  capital_flow: {
    description: "[资金] 市场/板块/个股资金流向",
    handler: async ({ args }) => {
      return `[资金] 资金流向数据暂未入库，请使用概念排名(concept_ranking)和板块分析(sector_analysis)工具`;
    },
  },
  concept_ranking: {
    description: "[概念] 概念板块排名(按股票数量)",
    handler: async ({ supabase }) => {
      const { data } = await supabase.from("base_concepts").select("concept_id, concept_name, category").order("concept_id").limit(100);
      if (!data?.length) return "[概念排名] 请先执行 sync_concepts 同步概念数据";
      const lines: string[] = ["=== 概念排名 ==="];
      for (const c of data) {
        const { count } = await supabase.from("base_stock_concepts").select("*", { count: "exact", head: true }).eq("concept_id", c.concept_id);
        lines.push(`${c.concept_name} (${count ?? 0}只) [${c.category ?? "em"}]`);
      }
      return lines.join("\n");
    },
  },
  sector_analysis: {
    description: "[板块] 板块分析(涨跌幅+主力净流入)",
    handler: async ({ supabase }) => {
      const { data: dtRow } = await supabase.from("daily_sector").select("trade_date").order("trade_date", { ascending: false }).limit(1);
      const dt = dtRow?.[0]?.trade_date;
      if (!dt) return "[板块分析] 无数据";
      const { data } = await supabase.from("daily_sector").select("*").eq("trade_date", dt).order("change_pct", { ascending: false }).limit(30);
      if (!data?.length) return "[板块分析] 无数据";
      const lines: string[] = [`=== 板块分析 (${dt}) ===`];
      for (const s of data) {
        const inflow = s.main_net_inflow ? ` 主力净${(Number(s.main_net_inflow) / 1e8).toFixed(2)}亿` : "";
        lines.push(`${s.sector_name}: ${Number(s.change_pct ?? 0).toFixed(2)}%${inflow}`);
      }
      return lines.join("\n");
    },
  },
};

// === Review Tools ===
const REVIEW_TOOLS: Record<string, ToolDef> = {
  review_history: {
    description: "[复盘] 近N日(默认20天)复盘: 涨停数/跌停数/平均涨幅",
    handler: async ({ supabase, args }) => {
      const days = Math.min(Number(args.days) || 20, 60);
      const dt = await lastTradeDate();
      if (!dt) return "[复盘历史] 无数据";
      const { data } = await supabase
        .from("daily_kline").select("trade_date, change_pct, amount").gte("trade_date", `${dt}::date - interval '${days * 2} days'`).order("trade_date", { ascending: false });
      if (!data?.length) return "[复盘历史] 无数据";
      const byDate = new Map<string, { up: number; down: number; total: number; sumPct: number; sumAmt: number }>();
      for (const r of data) {
        const d = r.trade_date;
        if (!byDate.has(d)) byDate.set(d, { up: 0, down: 0, total: 0, sumPct: 0, sumAmt: 0 });
        const g = byDate.get(d)!;
        const pct = Number(r.change_pct ?? 0);
        if (pct >= 9.8) g.up++;
        else if (pct <= -9.8) g.down++;
        g.total++;
        g.sumPct += pct;
        g.sumAmt += Number(r.amount ?? 0);
      }
      const sorted = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, days);
      const lines: string[] = ["=== 复盘历史 ===", "日期        | 涨停 | 跌停 | 平均涨跌幅 | 成交额"];
      for (const [d, g] of sorted) {
        const avgPct = g.total > 0 ? (g.sumPct / g.total).toFixed(2) : "0.00";
        const amt = (g.sumAmt / 1e8).toFixed(0);
        lines.push(`${d} | ${String(g.up).padStart(4)} | ${String(g.down).padStart(4)} | ${avgPct.padStart(6)}% | ${amt}亿`);
      }
      return lines.join("\n");
    },
  },
  review_daily: {
    description: "[复盘] 每日复盘: 市场概况+涨停TOP+热门主题",
    handler: async ({ supabase, args }) => {
      const date = (args.date as string) || "";
      const dt = date || await lastTradeDate();
      if (!dt) return "[每日复盘] 无数据";
      const lines: string[] = [`=== 每日复盘 (${dt}) ===`];
      const { count: up } = await supabase.from("daily_kline").select("*", { count: "exact", head: true }).eq("trade_date", dt).gte("change_pct", 9.8);
      const { count: down } = await supabase.from("daily_kline").select("*", { count: "exact", head: true }).eq("trade_date", dt).lte("change_pct", -9.8);
      lines.push(`涨停数: ${up ?? 0}家 / 跌停数: ${down ?? 0}家`);
      const { data: topUp } = await supabase
        .from("daily_limit_up").select("code, name:base_stocks!inner(name), continue_num, reason_info").eq("trade_date", dt).order("continue_num", { ascending: false }).limit(10);
      if (topUp?.length) {
        lines.push("\n涨停 TOP10:");
        for (const s of topUp) lines.push(`  ${s.continue_num}板 ${(s as any).name?.name ?? s.code}(${s.code}) ${s.reason_info || ""}`);
      }
      const { data: themes } = await supabase.from("daily_limit_up").select("reason_type, code").eq("trade_date", dt);
      if (themes?.length) {
        const themeCount = new Map<string, number>();
        for (const t of themes) { const th = t.reason_type || "其他"; themeCount.set(th, (themeCount.get(th) ?? 0) + 1); }
        const sorted = [...themeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        lines.push("\n热门主题:");
        for (const [th, cnt] of sorted) lines.push(`  ${th}: ${cnt}家`);
      }
      return lines.join("\n");
    },
  },
};

// ==== END Tools ====

const ALL_TOOLS: Record<string, ToolDef> = {
  ...MARKET_TOOLS,
  ...LIMIT_TOOLS,
  ...CAPITAL_TOOLS,
  ...REVIEW_TOOLS,
};

// === Server ===
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return Response.json({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }, { status: 400 });
  }

  const msgId = body.id ?? 0;
  const method = (body.method ?? "") as string;
  const params = (body.params ?? {}) as Record<string, unknown>;

  if (method === "tools/list") {
    const TOOL_SCHEMAS: Record<string, any> = {
        "market_overview": "{\"type\":\"object\",\"properties\":{}}",
        "kline": "{\"type\":\"object\",\"properties\":{\"code\":{\"type\":\"string\",\"description\":\"股票代码，如000001\"},\"days\":{\"type\":\"number\",\"description\":\"天数，默认60\"},\"adjust\":{\"type\":\"string\",\"description\":\"复权类型，none或qfq\",\"enum\":[\"none\",\"qfq\"]}},\"required\":[\"code\"]}",
        "minute_data": "{\"type\":\"object\",\"properties\":{\"code\":{\"type\":\"string\",\"description\":\"股票代码，如000001\"}},\"required\":[\"code\"]}",
        "stock_rank": "{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\",\"description\":\"排行类型\",\"enum\":[\"gainers\",\"losers\",\"amount\"]},\"limit\":{\"type\":\"number\",\"description\":\"数量，默认10\"}}}",
        "valuation_snapshot": "{\"type\":\"object\",\"properties\":{\"code\":{\"type\":\"string\",\"description\":\"股票代码\"}},\"required\":[\"code\"]}",
        "limit_stats": "{\"type\":\"object\",\"properties\":{}}",
        "limit_up_ladder": "{\"type\":\"object\",\"properties\":{}}",
        "broken_limit_up": "{\"type\":\"object\",\"properties\":{}}",
        "limit_down": "{\"type\":\"object\",\"properties\":{}}",
        "limit_bigloser": "{\"type\":\"object\",\"properties\":{}}",
        "limit_yesterday_premium": "{\"type\":\"object\",\"properties\":{}}",
        "capital_flow": "{\"type\":\"object\",\"properties\":{\"type\":{\"type\":\"string\",\"description\":\"可选sector返回板块资金排行\",\"enum\":[\"sector\"]}}}",
        "concept_ranking": "{\"type\":\"object\",\"properties\":{}}",
        "sector_analysis": "{\"type\":\"object\",\"properties\":{}}",
        "review_history": "{\"type\":\"object\",\"properties\":{\"days\":{\"type\":\"number\",\"description\":\"天数，默认20，最大60\"}}}",
        "review_daily": "{\"type\":\"object\",\"properties\":{\"date\":{\"type\":\"string\",\"description\":\"日期YYYY-MM-DD，默认最新交易日\"}}}"
    };
    const tools = Object.entries(ALL_TOOLS).map(([name, t]) => ({
      name, description: t.description,
      inputSchema: TOOL_SCHEMAS[name] ? JSON.parse(TOOL_SCHEMAS[name]) : { type: "object", properties: {} },
    }));
    return Response.json({ jsonrpc: "2.0", id: msgId, result: { tools } });
  }

  if (method === "tools/call") {
    const toolName = (params.name ?? "") as string;
    const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;
    const tool = ALL_TOOLS[toolName];
    if (!tool) return Response.json({ jsonrpc: "2.0", id: msgId, error: { code: -32601, message: `Unknown tool: ${toolName}` } });
    try {
      const start = performance.now();
      const resultText = await tool.handler({ supabase, args: toolArgs });
      const elapsed = Math.round(performance.now() - start);
      console.log(`${toolName} -> ${elapsed}ms`);
      return Response.json({ jsonrpc: "2.0", id: msgId, result: { content: [{ type: "text", text: resultText }] } });
    } catch (e) {
      console.error(`${toolName} failed:`, e);
      return Response.json({ jsonrpc: "2.0", id: msgId, result: { content: [{ type: "text", text: `[${toolName}] error: ${e}` }] } });
    }
  }

  return Response.json({ jsonrpc: "2.0", id: msgId, error: { code: -32601, message: `Unknown method: ${method}` } });
});
