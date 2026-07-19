path = r"D:\quicktiny\src\1-data\repository\ai.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add fetchBoardLadderForContext back
new_func = '''// ─── 市场上下文（MCP工具预加载） ──────────────────

export async function fetchBoardLadderForContext(): Promise<string> {
  try {
    const results = await Promise.allSettled([
      callMCPTool("market_overview", {}),
      callMCPTool("limit_stats", {}),
      callMCPTool("limit_up_ladder", {}),
    ]);
    const parts: string[] = [];
    if (results[0].status === "fulfilled" && results[0].value) parts.push(results[0].value);
    if (results[1].status === "fulfilled" && results[1].value) parts.push(results[1].value);
    if (results[2].status === "fulfilled" && results[2].value) parts.push(results[2].value);
    return parts.join("\\n\\n");
  } catch {
    return "";
  }
}

'''

# Insert before the news section
marker = "export async function fetchCailianNews"
pos = content.find(marker)
content = content[:pos] + new_func + content[pos:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added fetchBoardLadderForContext")
