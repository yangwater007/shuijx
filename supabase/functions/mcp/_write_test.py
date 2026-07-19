import json
data = {"jsonrpc":"2.0","id":1,"method":"tools/list"}
with open(r"D:\quicktiny\supabase\functions\mcp\test_call.json","w",encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("OK")
