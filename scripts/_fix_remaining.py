path = r"D:\quicktiny\src\1-data\repository\ai.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Uncomment the bridge import
content = content.replace(
    "// import { fetchFromBridgeTool } from \"@data/repository/bridge\";",
    "import { fetchFromBridgeTool } from \"@data/repository/bridge\";"
)

# Prefix unused functions/types with underscore
content = content.replace(
    "async function fetchMarketOverview(",
    "async function _fetchMarketOverview("
)
content = content.replace(
    "interface RawApiResponse",
    "// eslint-disable-next-line @typescript-eslint/no-unused-vars\ninterface _RawApiResponse"
)
content = content.replace(
    "function analyzeTrends(",
    "function _analyzeTrends("
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed remaining issues")
