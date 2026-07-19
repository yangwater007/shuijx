import type { ToolDef } from "./index.ts";

export const CAPITAL_TOOLS: Record<string, ToolDef> = {

  capital_flow: {
    description: "[??] ??/??/??????",
    handler: async ({ supabase, args }) => {
      const type = (args.type as string) || "market";
      // Capital flow data comes from external source, return basic stats from DB
      return `[??] ????????????????? Supabase ????????????????(concept_ranking)?????(sector_analysis)???`;
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
