import type { ToolDef } from "./index.ts";

// Last trade date from daily_kline
async function lastTradeDate(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("daily_kline")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1);
  return data?.[0]?.trade_date ?? null;
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export const MARKET_TOOLS: Record<string, ToolDef> = {

  market_overview: {
    description: "[??] ????????????(??PG?????)?????(??/??/???/??50)",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase) ?? todayStr();
      const { data } = await supabase.rpc("get_market_overview", { trade_date: dt });
      const rows = data ?? [];

      // Fallback: direct SQL via query
      const { data: upDown } = await supabase
        .from("daily_kline")
        .select("change_pct", { count: "exact" })
        .eq("trade_date", dt);

      const up = upDown?.filter((r: any) => r.change_pct > 0).length ?? 0;
      const down = upDown?.filter((r: any) => r.change_pct < 0).length ?? 0;
      const flat = (upDown?.length ?? 0) - up - down;

      let lines = [`=== A????? (${dt}) ===`];
      lines.push(`?? ${up}? / ?? ${down}? / ?? ${flat}?`);

      // Index data from rows
      for (const row of rows) {
        const sign = (row.change_pct ?? 0) >= 0 ? "+" : "";
        lines.push(
          `${row.name}: ${Number(row.price).toFixed(2)} ${sign}${Number(row.change_pct).toFixed(2)}% ` +
          `?${Number(row.open).toFixed(2)} ?${Number(row.high).toFixed(2)} ?${Number(row.low).toFixed(2)}`
        );
      }

      return lines.join("\n");
    },
  },

  kline: {
    description: "[??] ????K?(OHLC+???+???), ??????????: code(????), days(??,??60), adjust(fqf/none)",
    handler: async ({ supabase, args }) => {
      const code = (args.code as string) || "";
      const days = Number(args.days) || 60;

      if (!code) return "[kline] ???????";

      const { data, error } = await supabase
        .from("daily_kline")
        .select("*")
        .eq("code", code)
        .order("trade_date", { ascending: false })
        .limit(days);

      if (error) return `[kline] ????: ${error.message}`;
      if (!data?.length) return `[kline] ??? ${code} ?K???`;

      const bars = data.reverse();
      const first = bars[0];
      const last = bars[bars.length - 1];
      let lines = [
        `[Supabase] K? ${code}: ${bars.length}? (${first.trade_date} -> ${last.trade_date})`,
        `??      ??    ??    ??    ??    ???      ???`,
      ];

      for (const b of bars.slice(-30)) {
        lines.push(
          `${b.trade_date} ${Number(b.open).toFixed(2).padStart(7)} ${Number(b.high).toFixed(2).padStart(7)} ` +
          `${Number(b.low).toFixed(2).padStart(7)} ${Number(b.close).toFixed(2).padStart(7)} ` +
          `${String(b.volume).padStart(10)} ${Number(b.change_pct ?? 0).toFixed(2).padStart(7)}%`
        );
      }

      return lines.join("\n");
    },
  },

  minute_data: {
    description: "[??] ????????(????+??)???: code(????)",
    handler: async ({ supabase, args }) => {
      const code = (args.code as string) || "";
      if (!code) return "[minute] ???????";

      const dt = await lastTradeDate(supabase);
      const { data } = await supabase
        .from("realtime_timeshare")
        .select("*")
        .eq("code", code)
        .eq("trade_date", dt)
        .order("time", { ascending: true })
        .limit(242);

      if (!data?.length) return `[minute] ??? ${code} ?????`;

      const lines = [`[Supabase] ${code} ???? (${dt}): ${data.length}?`];
      for (const p of data) {
        lines.push(`${p.time} ${Number(p.price).toFixed(2)}`);
      }
      return lines.join("\n");
    },
  },

  stock_rank: {
    description: "[??] ????/??/??????type: gainers/losers/amount, limit: ??10",
    handler: async ({ supabase, args }) => {
      const type = (args.type as string) || "gainers";
      const limit = Number(args.limit) || 10;
      const dt = await lastTradeDate(supabase);

      let orderCol = "change_pct";
      let ascending = false;
      let label = "??";
      if (type === "losers") { ascending = true; label = "??"; }
      else if (type === "amount") { orderCol = "amount"; label = "???"; }

      const { data } = await supabase
        .from("daily_kline")
        .select("code, change_pct, amount")
        .eq("trade_date", dt)
        .order(orderCol, { ascending })
        .limit(limit);

      if (!data?.length) return `[??] ???`;

      return [`=== ${label}?? TOP${limit} (${dt}) ===`].concat(
        data.map((r: any, i: number) =>
          `${i + 1}. ${r.code} ${type === "amount" ? (Number(r.amount) / 1e8).toFixed(2) + "?" : Number(r.change_pct ?? 0).toFixed(2) + "%"}`
        )
      ).join("\n");
    },
  },

  valuation_snapshot: {
    description: "[??] ??????: PE/PB/?????: code(????)",
    handler: async ({ supabase, args }) => {
      const code = (args.code as string) || "";
      if (!code) return "[??] ???????";

      // Try to get from base_stocks (industry info)
      const { data } = await supabase
        .from("base_stocks")
        .select("*")
        .eq("code", code)
        .limit(1);

      if (!data?.length) return `[??] ??? ${code}`;

      const s = data[0];
      return [
        `[Supabase] ${s.code} ${s.name}`,
        `??: ${s.industry || "??"}`,
        `????: ${s.list_date || "??"}`,
        `ST: ${s.is_st ? "?" : "?"}`,
      ].join("\n");
    },
  },
};
