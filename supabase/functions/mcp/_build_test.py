import json

code = """import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient("https://test.supabase.co", "key");
Deno.serve(() => new Response(JSON.stringify({ok:true,ready:!!supabase}), {headers:{"Content-Type":"application/json"}}));
"""

payload = {"slug":"test-mcp","name":"test-mcp","body":code,"verify_jwt":False}
with open(r"D:\quicktiny\supabase\functions\mcp\test_mcp_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)
print("OK")
