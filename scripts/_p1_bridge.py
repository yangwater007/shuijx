# P1: Replace fetchBoardLadderForContext to use MCP tools instead of dead bridge

path = r"D:\quicktiny\src\1-data\repository\ai.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the entire function body
old_func = 'export async function fetchBoardLadderForContext(): Promise<string> {'
new_func_start = content.find(old_func)

# Find the matching closing brace
brace_count = 0
end_pos = new_func_start
found_start = False
for i in range(new_func_start, len(content)):
    if content[i] == '{':
        brace_count += 1
        found_start = True
    elif content[i] == '}':
        brace_count -= 1
        if found_start and brace_count == 0:
            end_pos = i + 1
            break

# Build replacement function
new_func = '''export async function fetchBoardLadderForContext(): Promise<string> {
  // Use MCP tools (Supabase Edge Function) for real-time data
  try {
    const [marketRes, limitRes, ladderRes] = await Promise.allSettled([
      callMCPTool("market_overview", {}),
      callMCPTool("limit_stats", {}),
      callMCPTool("limit_up_ladder", {}),
    ]);
    const parts: string[] = [];
    if (marketRes.status === "fulfilled" && marketRes.value) parts.push(marketRes.value);
    if (limitRes.status === "fulfilled" && limitRes.value) parts.push(limitRes.value);
    if (ladderRes.status === "fulfilled" && ladderRes.value) parts.push(ladderRes.value);
    return parts.join("\\n\\n");
  } catch {
    return "";
  }
}'''

content = content[:new_func_start] + new_func + content[end_pos:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("P1 done - replaced bridge calls with MCP")
