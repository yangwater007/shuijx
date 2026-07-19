import json

env_data = {
    "key": "VITE_MCP_URL",
    "value": "https://qzqpymvboltyvddpmpct.supabase.co/functions/v1/mcp",
    "type": "plain",
    "target": ["production", "preview", "development"]
}

with open(r"D:\quicktiny\tmp\vercel_env.json", "w", encoding="utf-8") as f:
    json.dump(env_data, f, ensure_ascii=False)
print("OK")
