import type { ToolDef } from "./index.ts";

export const CAPITAL_TOOLS: Record<string, ToolDef> = {

    capital_flow: {
    description: "[东财] 板块/大盘资金流向",
    handler: async ({ supabase, args }) => {
      const type = (args.type as string) || "market";
      
      // Get latest trade date
      const { data: dtRow } = await supabase
        .from("sector_capital_flow")
        .select("trade_date")
        .order("trade_date", { ascending: false })
        .limit(1);
      
      const dt = dtRow?.[0]?.trade_date;
      if (!dt) return "[资金] 暂无板块资金流数据，请先运行 sync_capital_flow.py";

      if (type === "sector") {
        const { data } = await supabase
          .from("sector_capital_flow")
          .select("*")
          .eq("trade_date", dt)
          .order("main_net_in", { ascending: false })
          .limit(30);
        
        if (!data?.length) return "[资金] 暂无数据";
        
        const lines = [`=== 板块资金流向 (${dt}) ===`];
        lines.push("板块 | 主力净流入 | 净占比 | 涨跌幅");
        for (const s of data as any[]) {
          const inflow = (Number(s.main_net_in) / 1e8).toFixed(2);
          lines.push(`${s.sector_name}: ${inflow}亿 ${Number(s.main_net_in_pct).toFixed(1)}% ${Number(s.change_pct).toFixed(2)}%`);
        }
        return lines.join("\n");
      }
      
      // Market overview: sum all sectors
      const { data } = await supabase
        .from("sector_capital_flow")
        .select("main_net_in")
        .eq("trade_date", dt);
      
      const totalInflow = (data ?? []).reduce((sum: number, s: any) => sum + Number(s.main_net_in ?? 0), 0);
      const sign = totalInflow >= 0 ? "流入" : "流出";
      return `[东财] 大盘主力资金 (${dt}): ${sign} ${(Math.abs(totalInflow) / 1e8).toFixed(2)}亿`;
    },
  },

  concept_ranking: {
    description: "[??] ????????(??????)",
    handler: async ({ supabase }) => {
      // Query base_concepts and join with base_stock_concepts for count
      const { data } = await supabase
        .from("base_concepts")
        .select("concept_id, concept_name, category")
        .order("concept_id")
        .limit(100);

      if (!data?.length) return "[????] ??????????? sync_concepts";

      // For each concept, count stocks
      const lines: string[] = ["=== ?????? ==="];
      for (const c of data as any[]) {
        const { count } = await supabase
          .from("base_stock_concepts")
          .select("*", { count: "exact", head: true })
          .eq("concept_id", c.concept_id);
        lines.push(`${c.concept_name} (${count ?? 0}?) [${c.category ?? "em"}]`);
      }

      return lines.join("\n");
    },
  },

  sector_analysis: {
    description: "[??] ??????(??+???),??????",
    handler: async ({ supabase }) => {
      // Query daily_sector for latest date
      const { data: dtRow } = await supabase
        .from("daily_sector")
        .select("trade_date")
        .order("trade_date", { ascending: false })
        .limit(1);

      const dt = dtRow?.[0]?.trade_date;
      if (!dt) return "[????] ???";

      const { data } = await supabase
        .from("daily_sector")
        .select("*")
        .eq("trade_date", dt)
        .order("change_pct", { ascending: false })
        .limit(30);

      if (!data?.length) return "[????] ???";

      const lines: string[] = [`=== ?????? (${dt}) ===`];
      for (const s of data as any[]) {
        const inflow = s.main_net_inflow
          ? ` ???${(Number(s.main_net_inflow) / 1e8).toFixed(2)}?`
          : "";
        lines.push(`${s.sector_name}: ${Number(s.change_pct ?? 0).toFixed(2)}%${inflow}`);
      }

      return lines.join("\n");
    },
  },
};
