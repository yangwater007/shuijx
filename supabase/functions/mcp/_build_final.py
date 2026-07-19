import json

with open(r"D:\quicktiny\supabase\functions\mcp\index_single.ts", "r", encoding="utf-8") as f:
    code = f.read()

# Fix: use npm: prefix instead of esm.sh
code = code.replace(
    'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";',
    'import { createClient } from "npm:@supabase/supabase-js@2";'
)

payload = {"slug":"mcp","name":"mcp","body":code,"verify_jwt":False}

with open(r"D:\quicktiny\supabase\functions\mcp\deploy_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)

print("Built")
