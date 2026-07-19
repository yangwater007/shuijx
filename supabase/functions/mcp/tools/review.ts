import type { ToolDef } from "./index.ts";

async function lastTradeDate(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("daily_kline").select("trade_date").order("trade_date", { ascending: false }).limit(1);
  return data?.[0]?.trade_date ?? null;
}

export const REVIEW_TOOLS: Record<string, ToolDef> = {

  review_history: {
    description: "[??] ?N?(??20?)????: ???/???/???",
    handler: async ({ supabase, args }) => {
      const days = Math.min(Number(args.days) || 20, 60);
      const dt = await lastTradeDate(supabase);
      if (!dt) return "[????] ???";

      const { data } = await supabase
        .from("daily_kline")
        .select("trade_date, change_pct, amount")
        .gte("trade_date", `${dt}::date - interval '${days * 2} days'`)
        .order("trade_date", { ascending: false });

      if (!data?.length) return "[????] ???";

      // Group by trade_date
      const byDate = new Map<string, { up: number; down: number; total: number; sumPct: number; sumAmt: number }>();
      for (const r of data as any[]) {
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

      const sorted = [...byDate.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, days);

      const lines: string[] = ["=== ???? ==="];
      lines.push("??        | ?? | ?? | ???  | ???");
      for (const [d, g] of sorted) {
        const avgPct = g.total > 0 ? (g.sumPct / g.total).toFixed(2) : "0.00";
        const amt = (g.sumAmt / 1e8).toFixed(0);
        lines.push(`${d} | ${String(g.up).padStart(4)} | ${String(g.down).padStart(4)} | ${avgPct.padStart(6)}% | ${amt}?`);
      }

      return lines.join("\n");
    },
  },

  review_daily: {
    description: "[??] ??????: ????+????+????",
    handler: async ({ supabase, args }) => {
      const date = (args.date as string) || "";
      const dt = date || await lastTradeDate(supabase);
      if (!dt) return "[????] ???";

      const lines: string[] = [`=== ???? (${dt}) ===`];

      // Market overview
      const { count: up } = await supabase
        .from("daily_kline").select("*", { count: "exact", head: true })
        .eq("trade_date", dt).gte("change_pct", 9.8);
      const { count: down } = await supabase
        .from("daily_kline").select("*", { count: "exact", head: true })
        .eq("trade_date", dt).lte("change_pct", -9.8);

      lines.push(`???: ${up ?? 0}? / ${down ?? 0}?`);

      // Top limit-up stocks
      const { data: topUp } = await supabase
        .from("daily_limit_up")
        .select("code, name:base_stocks!inner(name), continue_num, reason_info")
        .eq("trade_date", dt)
        .order("continue_num", { ascending: false })
        .limit(10);

      if (topUp?.length) {
        lines.push("\n???? TOP10:");
        for (const s of topUp as any[]) {
          lines.push(`  ${s.continue_num}? ${s.name?.name ?? s.code}(${s.code}) ${s.reason_info || ""}`);
        }
      }

      // Top themes
      const { data: themes } = await supabase
        .from("daily_limit_up")
        .select("reason_type, code")
        .eq("trade_date", dt);

      if (themes?.length) {
        const themeCount = new Map<string, number>();
        for (const t of themes as any[]) {
          const th = t.reason_type || "??";
          themeCount.set(th, (themeCount.get(th) ?? 0) + 1);
        }
        const sorted = [...themeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        lines.push("\n????:");
        for (const [th, cnt] of sorted) {
          lines.push(`  ${th}: ${cnt}?`);
        }
      }

      return lines.join("\n");
    },
  },
};
