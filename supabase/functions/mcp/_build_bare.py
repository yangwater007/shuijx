import json

code = "Deno.serve(() => new Response(JSON.stringify({ok:true}), {headers:{\"Content-Type\":\"application/json\"}}));"

payload = {"slug":"bare-mcp","name":"bare-mcp","body":code,"verify_jwt":False}
with open(r"D:\quicktiny\supabase\functions\mcp\bare_payload.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)
print("OK")
