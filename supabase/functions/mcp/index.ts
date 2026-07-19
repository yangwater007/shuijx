import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://qzqpymvboltyvddpmpct.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; // set SUPABASE_SERVICE_ROLE_KEY env var

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function lastTradeDate(): Promise<string | null> {
  const { data } = await supabase
    .from("daily_kline").select("trade_date").order("trade_date", { ascending: false }).limit(1);
  return data?.[0]?.trade_date ?? null;
}

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
    const tools = Object.entries(ALL_TOOLS).map(([name, t]) => ({
      name, description: t.description,
      inputSchema: { type: "object", properties: {} },
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
