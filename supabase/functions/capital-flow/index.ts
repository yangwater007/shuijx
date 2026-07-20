import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = "https://qzqpymvboltyvddpmpct.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6cXB5bXZib2x0eXZkZHBtcGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4MjYxNjIsImV4cCI6MjA2NDQwMjE2Mn0";

Deno.serve(async (req: Request) => {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { type = "sector", limit = 30 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: dtRow } = await supabase
      .from("sector_capital_flow")
      .select("trade_date")
      .order("trade_date", { ascending: false })
      .limit(1);

    const dt = dtRow?.[0]?.trade_date;

    const { data, error } = await supabase
      .from("sector_capital_flow")
      .select("*")
      .eq("trade_date", dt)
      .order("main_net_in", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const items = (data ?? []).map((s: any) => ({
      code: s.sector_code,
      name: s.sector_name,
      changePct: Number(s.change_pct ?? 0),
      mainNetIn: Number(s.main_net_in ?? 0),
      mainNetInPct: Number(s.main_net_in_pct ?? 0),
      superLargeNetIn: Number(s.super_large_net_in ?? 0),
    }));

    return new Response(JSON.stringify({ success: true, data: items, date: dt }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers });
  }
});
