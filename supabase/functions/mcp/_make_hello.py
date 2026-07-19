import json

code = r'Deno.serve((req) => new Response(JSON.stringify({ok:true}), {headers:{"Content-Type":"application/json"}}));'
payload = {"slug":"hello","name":"hello","body":code,"verify_jwt":False}

with open(r"D:\quicktiny\supabase\functions\mcp\hello_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)

with open(r"D:\quicktiny\supabase\functions\mcp\hello_payload.json", "rb") as f:
    h = f.read(3)
print("BOM" if h == b"\xef\xbb\xbf" else "OK no BOM: " + h.hex())
