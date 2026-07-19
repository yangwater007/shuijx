path = r"D:\quicktiny\src\1-data\repository\ai.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove _fetchMarketOverview function completely - find its block
start = content.find("async function _fetchMarketOverview(")
if start != -1:
    # Find matching closing brace
    brace = 0
    i = content.find("{", start)
    end = i
    while end < len(content):
        if content[end] == "{": brace += 1
        elif content[end] == "}": 
            brace -= 1
            if brace == 0:
                end += 1
                break
        end += 1
    # Remove any leading whitespace/newlines before
    while start > 0 and content[start-1] in (" ", "\n", "\r"):
        start -= 1
    content = content[:start] + content[end:]
    print("Removed _fetchMarketOverview")

# Remove _analyzeTrends
start = content.find("function _analyzeTrends(")
if start != -1:
    brace = 0
    i = content.find("{", start)
    end = i
    while end < len(content):
        if content[end] == "{": brace += 1
        elif content[end] == "}": 
            brace -= 1
            if brace == 0:
                end += 1
                break
        end += 1
    while start > 0 and content[start-1] in (" ", "\n", "\r"):
        start -= 1
    content = content[:start] + content[end:]
    print("Removed _analyzeTrends")

# Remove _RawApiResponse interface
start = content.find("interface _RawApiResponse")
if start != -1:
    end = content.find("}", start) + 1
    while start > 0 and content[start-1] in (" ", "\n", "\r"):
        start -= 1
    content = content[:start] + content[end:]
    print("Removed _RawApiResponse")

# Remove remaining dead code - RawApiStock, RawApiLevel, RawApiDate interfaces
for name in ["RawApiStock", "RawApiLevel", "RawApiDate"]:
    start = content.find(f"interface {name}")
    if start != -1:
        end = content.find("}", start) + 1
        while start > 0 and content[start-1] in (" ", "\n", "\r"):
            start -= 1
        content = content[:start] + content[end:]
        print(f"Removed {name}")

# Remove unused import types
content = content.replace(
    'import type { NewsItem, KaipanlaItem } from "@infra/types/ai";\n',
    'import type { NewsItem, KaipanlaItem } from "@infra/types/ai";\n/* eslint-disable @typescript-eslint/no-unused-vars */\n'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("All dead code removed")
