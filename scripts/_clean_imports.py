path = r"D:\quicktiny\src\1-data\repository\ai.ts"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Remove getBridgeUrl from import
for i, line in enumerate(lines):
    if "getBridgeUrl" in line and "import" in line:
        lines[i] = line.replace("getBridgeUrl, ", "").replace(", getBridgeUrl", "")
        print(f"L{i+1}: removed getBridgeUrl from import")
        break

# Remove fetchFromBridgeTool import if unused
for i, line in enumerate(lines):
    if "fetchFromBridgeTool" in line and "import" in line:
        lines[i] = "// " + line  # Comment out since we don't know if used elsewhere
        print(f"L{i+1}: commented fetchFromBridgeTool import")
        break

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
print("Cleaned imports")
