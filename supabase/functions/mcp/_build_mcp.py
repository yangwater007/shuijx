import json

with open(r"D:\quicktiny\supabase\functions\mcp\index_single.ts", "r", encoding="utf-8") as f:
    code = f.read()

# Fix: use supabase-js without @2 which might not resolve
code = code.replace(
    'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";',
    'import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";'
)

payload = {"slug":"mcp","name":"mcp","body":code,"verify_jwt":False}

with open(r"D:\quicktiny\supabase\functions\mcp\deploy_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)

print(f"Payload: {len(json.dumps(payload, ensure_ascii=False))} bytes, slug included")
