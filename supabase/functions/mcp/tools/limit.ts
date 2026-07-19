import type { ToolDef } from "./index.ts";

async function lastTradeDate(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("daily_kline").select("trade_date").order("trade_date", { ascending: false }).limit(1);
  return data?.[0]?.trade_date ?? null;
}

export const LIMIT_TOOLS: Record<string, ToolDef> = {

  limit_stats: {
    description: "[??] ??????: ?????/???/???(??>0)",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[????] ???";

      // Up count: stocks with change_pct >= 9.8 today
      const { count: up } = await supabase
        .from("daily_kline").select("*", { count: "exact", head: true })
        .eq("trade_date", dt).gte("change_pct", 9.8);

      const { count: down } = await supabase
        .from("daily_kline").select("*", { count: "exact", head: true })
        .eq("trade_date", dt).lte("change_pct", -9.8);

      const { count: broken } = await supabase
        .from("daily_limit_up").select("*", { count: "exact", head: true })
        .eq("trade_date", dt).gt("open_count", 0);

      const sealRate = (up ?? 0) + (broken ?? 0) > 0
        ? ((up ?? 0) / ((up ?? 0) + (broken ?? 0)) * 100).toFixed(1)
        : "0";

      return [
        `[Supabase] ${dt} ????:`,
        `??: ${up ?? 0}? | ??: ${down ?? 0}? | ??: ${broken ?? 0}?`,
        `???: ${sealRate}%`,
      ].join("\n");
    },
  },

  limit_up_ladder: {
    description: "[??] ????: ????????????+????+??",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[????] ???";

      const { data } = await supabase
        .from("daily_limit_up")
        .select("code, name:base_stocks!inner(name), continue_num, change_pct, turnover_rate, reason_type, reason_info")
        .eq("trade_date", dt)
        .order("continue_num", { ascending: false })
        .limit(50);

      if (!data?.length) return "[????] ???????????";

      const byLevel = new Map<number, string[]>();
      for (const s of data as any[]) {
        const n = s.continue_num ?? 1;
        if (!byLevel.has(n)) byLevel.set(n, []);
        const name = s.name?.name ?? s.code;
        byLevel.get(n)!.push(
          `${name}(${s.code}) ${s.change_pct}% ?${(s.turnover_rate ?? 0).toFixed(1)}% ${s.reason_info || ""}`
        );
      }

      const lines: string[] = [`=== ???? (${dt}) ===`, `??: ${data.length}?`];
      for (const [level, stocks] of [...byLevel.entries()].sort((a, b) => Number(b[0]) - Number(a[0]))) {
        lines.push(`${level}? (${stocks.length}?): ${stocks.join(" | ")}`);
      }
      return lines.join("\n");
    },
  },

  broken_limit_up: {
    description: "[??] ???: ????????",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[???] ???";

      const { data } = await supabase
        .from("daily_limit_up")
        .select("code, name:base_stocks!inner(name), open_count, change_pct, reason_info")
        .eq("trade_date", dt)
        .gt("open_count", 0)
        .order("open_count", { ascending: false });

      if (!data?.length) return "[???] ?????";

      return [`=== ??? (${dt}) ===`].concat(
        (data as any[]).map((s, i) =>
          `${i + 1}. ${s.name?.name ?? s.code}(${s.code}) ?${s.open_count}? ${s.change_pct}% ${s.reason_info || ""}`
        )
      ).join("\n");
    },
  },

  limit_down: {
    description: "[??] ???: ????????",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[???] ???";

      const { data } = await supabase
        .from("daily_kline")
        .select("code, change_pct, turnover")
        .eq("trade_date", dt)
        .lte("change_pct", -9.8)
        .order("change_pct", { ascending: true })
        .limit(30);

      if (!data?.length) return "[???] ?????";

      return [`=== ??? (${dt}) ===`].concat(
        (data as any[]).map((s, i) =>
          `${i + 1}. ${s.code} ${s.change_pct}% ??${(s.turnover ?? 0).toFixed(1)}%`
        )
      ).join("\n");
    },
  },

  limit_bigloser: {
    description: "[??] ???(??>10%)????(????????)",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[??] ???";

      const { data: bigLosers } = await supabase
        .from("daily_kline")
        .select("code, name:base_stocks!inner(name), change_pct")
        .eq("trade_date", dt)
        .lte("change_pct", -10)
        .order("change_pct", { ascending: true });

      const { data: yesterdayUp } = await supabase
        .from("daily_limit_up")
        .select("code")
        .lt("trade_date", dt)
        .order("trade_date", { ascending: false })
        .limit(1);

      let nuclearLines: string[] = [];
      if (yesterdayUp?.length) {
        const yesterdayDt = yesterdayUp[0].trade_date ?? yesterdayUp;
        const yesterdayCodes = (await supabase
          .from("daily_limit_up")
          .select("code")
          .eq("trade_date", typeof yesterdayDt === "string" ? yesterdayDt : (yesterdayDt as any).trade_date)
        ).data?.map((r: any) => r.code) ?? [];

        if (yesterdayCodes.length) {
          const { data: nuclear } = await supabase
            .from("daily_kline")
            .select("code, name:base_stocks!inner(name), change_pct")
            .eq("trade_date", dt)
            .lte("change_pct", -9.8)
            .in("code", yesterdayCodes);

          nuclearLines = (nuclear as any[] ?? []).map((s: any, i: number) =>
            `${i + 1}. ${s.name?.name ?? s.code}(${s.code}) ${s.change_pct}%`
          );
        }
      }

      const result: Record<string, any> = {
        bigLosers: (bigLosers as any[] ?? []).map((s: any) => ({
          code: s.code, name: s.name?.name ?? s.code, changePercent: Number(s.change_pct ?? 0),
        })),
        nuclearButtons: nuclearLines.length
          ? nuclearLines.map((l) => ({ changePercent: 0, code: "", name: l }))
          : [],
        tradeDate: dt,
      };

      return JSON.stringify(result, null, 2);
    },
  },

  limit_yesterday_premium: {
    description: "[??] ????????: ????????, >2%??, <0%??????",
    handler: async ({ supabase }) => {
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[??] ???";

      // Get yesterday's trade date
      const { data: yestRow } = await supabase
        .from("daily_kline")
        .select("trade_date")
        .lt("trade_date", dt)
        .order("trade_date", { ascending: false })
        .limit(1);

      const yesterday = yestRow?.[0]?.trade_date;
      if (!yesterday) return "[??] ?????";

      // Codes that hit limit up yesterday
      const { data: yestCodes } = await supabase
        .from("daily_limit_up")
        .select("code")
        .eq("trade_date", yesterday);

      if (!yestCodes?.length) return "[??] ?????";

      const codes = (yestCodes as any[]).map((r: any) => r.code);
      const { data: today } = await supabase
        .from("daily_kline")
        .select("change_pct")
        .eq("trade_date", dt)
        .in("code", codes);

      if (!today?.length) return "[??] ?????";

      const rets = (today as any[]).map((r: any) => Number(r.change_pct ?? 0));
      const avg = (rets.reduce((a: number, b: number) => a + b, 0) / rets.length).toFixed(2);

      return `[??????] ${yesterday}??${codes.length}? -> ????${avg}% (${rets.length}?????) | ${Number(avg) >= 2 ? "??" : Number(avg) >= 0 ? "??" : "??"}`;
    },
  },
};
