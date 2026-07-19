import re

# Fix ai.ts
with open(r"D:\quicktiny\src\1-data\repository\ai.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from "@infra/config";',
    'import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, getBridgeUrl } from "@infra/config";'
)
content = content.replace(
    'const dc = (d: RawApiDate | null, fn: (d: RawApiDate) => string) => d ? fn(d) : "-";',
    'const dc = (d: RawApiDate | null | undefined, fn: (d: RawApiDate) => string) => d ? fn(d) : "-";'
)

with open(r"D:\quicktiny\src\1-data\repository\ai.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("ai.ts fixed")

# Fix AIService.ts - filter type cast
with open(r"D:\quicktiny\src\2-service\ai\AIService.ts", "r", encoding="utf-8") as f:
    content = f.read()

old = 'r.tool_calls = r.tool_calls.filter((tc: { id: string }) => toolCallIds.has(tc.id));'
new = 'r.tool_calls = (r.tool_calls as { id: string }[]).filter((tc) => toolCallIds.has(tc.id));'
if old not in content:
    # Try finding similar pattern
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if "tool_calls = r.tool_calls.filter" in line:
            print(f"Found at line {i+1}: {line.strip()}")
            lines[i] = lines[i].replace(
                'r.tool_calls.filter((tc: { id: string }) => toolCallIds.has(tc.id))',
                '(r.tool_calls as { id: string }[]).filter((tc) => toolCallIds.has(tc.id))'
            )
            break
    content = "\n".join(lines)
else:
    content = content.replace(old, new)

with open(r"D:\quicktiny\src\2-service\ai\AIService.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("AIService.ts fixed")

# Fix useCapitalFlow.ts - non-null assertions
with open(r"D:\quicktiny\src\3-business\visualization\useCapitalFlow.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'catMap[cat].inflow += Math.abs(item.mainInflow ?? 0);',
    'catMap[cat]!.inflow += Math.abs(item.mainInflow ?? 0);'
)
content = content.replace(
    'catMap[cat].subs.push(item);',
    'catMap[cat]!.subs.push(item);'
)

with open(r"D:\quicktiny\src\3-business\visualization\useCapitalFlow.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("useCapitalFlow.ts fixed")

print("All done")
