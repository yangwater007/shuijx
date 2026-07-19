path = r"D:\quicktiny\src\1-data\repository\mcp.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix: missing comma before valuation_snapshot
content = content.replace(
    '  }\n  \n  {\n    name: "valuation_snapshot"',
    '  },\n  {\n    name: "valuation_snapshot"'
)

# Fix: missing comma before limit_bigloser
content = content.replace(
    '  }\n  {\n    name: "limit_bigloser"',
    '  },\n  {\n    name: "limit_bigloser"'
)

# Fix: missing comma after stock_screener removal - check near end
# Find the pattern: }  { name (missing comma)
import re
content = re.sub(r'\n  }\n  \{\n    name:', '\n  },\n  {\n    name:', content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed commas")

# Verify by rebuilding
