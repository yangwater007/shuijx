path = r"D:\quicktiny\src\1-data\repository\mcp.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove tools that don't exist on backend: dragon_tiger, research_reports, stock_search, stock_screener
tools_to_remove = ["dragon_tiger", "research_reports", "stock_search", "stock_screener"]

for tool in tools_to_remove:
    # Find and remove the function definition block
    start_marker = f'name: "{tool}"'
    idx = content.find(start_marker)
    if idx == -1:
        print(f"  {tool}: not found")
        continue
    
    # Find the start of this object (the opening {)
    obj_start = content.rfind("{", 0, idx)
    if obj_start == -1:
        print(f"  {tool}: no opening brace")
        continue
    
    # Find the matching closing brace
    brace_count = 1
    obj_end = obj_start + 1
    while obj_end < len(content) and brace_count > 0:
        if content[obj_end] == "{":
            brace_count += 1
        elif content[obj_end] == "}":
            brace_count -= 1
        obj_end += 1
    
    # Remove the comma before or after
    before = content[obj_start-5:obj_start]
    after = content[obj_end:obj_end+5]
    
    start_cut = obj_start
    end_cut = obj_end
    
    # If there's a comma before, remove it
    trimmed_before = content[:obj_start].rstrip()
    if trimmed_before.endswith(","):
        start_cut = len(trimmed_before) - 1
    # If there's a comma after, remove it
    trimmed_after = content[obj_end:].lstrip()
    if trimmed_after.startswith(","):
        end_cut = obj_end + content[obj_end:].find(",") + 1
    
    content = content[:start_cut] + content[end_cut:]
    print(f"  {tool}: removed")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("P2 done - aligned tool list")
