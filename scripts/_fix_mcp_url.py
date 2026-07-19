import re

path = r"D:\quicktiny\src\0-infra\config\index.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Find getMCPUrl function and add MCP_BASE_URL as final fallback
# The function currently falls through to bridge URL or localhost
# We need to change the final fallback to MCP_BASE_URL

old_fallback = 'return "http://localhost:8766/mcp";'
new_fallback = '  return MCP_BASE_URL;  // Supabase Edge Function'

content = content.replace(old_fallback, new_fallback)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed getMCPUrl fallback")
