import re

# Fix StockDetailModal.tsx
with open(r"D:\quicktiny\src\4-presentation\components\business\StockDetailModal\StockDetailModal.tsx", "r", encoding="utf-8") as f:
    content = f.read()
# Fix the actual variable name - it's still "isTradingHours" not "_isTradingHours"
lines = content.split("\n")
for i, line in enumerate(lines):
    if "isTradingHours" in line and "const [" in line:
        lines[i] = line.replace("isTradingHours", "_isTradingHours")
        print(f"StockDetailModal L{i+1}: fixed isTradingHours")
    if "LUNCH_END_MIN" in line and "const " in line:
        lines[i] = "// " + lines[i]  # Comment out the entire line
        print(f"StockDetailModal L{i+1}: commented out LUNCH_END_MIN")
content = "\n".join(lines)
with open(r"D:\quicktiny\src\4-presentation\components\business\StockDetailModal\StockDetailModal.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("StockDetailModal.tsx fixed")

# Fix AIAnalysis.tsx - remove destructured unused vars entirely
with open(r"D:\quicktiny\src\4-presentation\pages\AIAnalysis\AIAnalysis.tsx", "r", encoding="utf-8") as f:
    content = f.read()
lines = content.split("\n")
for i, line in enumerate(lines):
    line_str = line.strip()
    if "const [frameworks" in line_str or "const [_frameworks" in line_str:
        lines[i] = "// " + line
        print(f"AIAnalysis L{i+1}: commented out frameworks")
    if "const [news" in line_str or "const [_news" in line_str:
        lines[i] = "// " + line
        print(f"AIAnalysis L{i+1}: commented out news/hotStocks")
    if "const [thinkingText" in line_str or "const [_thinkingText" in line_str:
        lines[i] = "// " + line
        print(f"AIAnalysis L{i+1}: commented out thinkingText")
content = "\n".join(lines)
with open(r"D:\quicktiny\src\4-presentation\pages\AIAnalysis\AIAnalysis.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("AIAnalysis.tsx fixed")

# Fix Charts.tsx
with open(r"D:\quicktiny\src\4-presentation\pages\Charts\Charts.tsx", "r", encoding="utf-8") as f:
    content = f.read()
lines = content.split("\n")
for i, line in enumerate(lines):
    if "import React" in line and "lazy" in line:
        # Remove lazy and Suspense from import
        new_line = line.replace("lazy, ", "").replace(", Suspense", "").replace("Suspense, ", "")
        lines[i] = new_line
        print(f"Charts L{i+1}: fixed import")
        break
content = "\n".join(lines)
with open(r"D:\quicktiny\src\4-presentation\pages\Charts\Charts.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Charts.tsx fixed")

# Fix DragonTigerBoard.tsx
with open(r"D:\quicktiny\src\4-presentation\pages\DragonTiger\DragonTigerBoard.tsx", "r", encoding="utf-8") as f:
    content = f.read()
lines = content.split("\n")
for i, line in enumerate(lines):
    if "import " in line and "STOCK_FLAT" in line:
        # Remove STOCK_FLAT
        new_line = line.replace("STOCK_FLAT, ", "").replace(", STOCK_FLAT,", ",").replace(", STOCK_FLAT", "").replace("STOCK_FLAT", "")
        lines[i] = new_line
        print(f"DragonTiger L{i+1}: fixed import")
        break
content = "\n".join(lines)
with open(r"D:\quicktiny\src\4-presentation\pages\DragonTiger\DragonTigerBoard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("DragonTigerBoard.tsx fixed")

# Fix fundflow.config.ts - cast entire problematic exports as any
with open(r"D:\quicktiny\src\4-presentation\components\charts\ECharts\configs\fundflow.config.ts", "r", encoding="utf-8") as f:
    content = f.read()

# The issue is with tooltip formatters and series types. Add as any to the tooltip option
# Fix tooltip at line ~66
content = content.replace(
    'formatter: (params: { name?: string; value?: number; dataType?: string; }) => string =',
    'formatter: ((params: any) => string) ='
)

# Fix tooltip at line ~112
content = content.replace(
    'formatter: (params: { name: string; value: number; }[]) => string',
    'formatter: ((params: any) => string) as any'
)

# Fix label formatter at line ~137
content = content.replace(
    'formatter: (p: { value: number; }) => string;',
    'formatter: ((p: any) => string) as any;'
)

with open(r"D:\quicktiny\src\4-presentation\components\charts\ECharts\configs\fundflow.config.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("fundflow.config.ts fixed")

print("\nAll done")
