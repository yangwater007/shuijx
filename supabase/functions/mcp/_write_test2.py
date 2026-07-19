import json
data = {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"limit_stats","arguments":{}}}
with open(r"D:\quicktiny\supabase\functions\mcp\test_call.json","w",encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("OK")
