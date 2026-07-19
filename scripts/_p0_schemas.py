import json, re

path = r"D:\quicktiny\supabase\functions\mcp\index_single.ts"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# Build input schemas for each tool
schemas = {
    "market_overview": '{"type":"object","properties":{}}',
    "kline": '{"type":"object","properties":{"code":{"type":"string","description":"股票代码，如000001"},"days":{"type":"number","description":"天数，默认60"},"adjust":{"type":"string","description":"复权类型，none或qfq","enum":["none","qfq"]}},"required":["code"]}',
    "minute_data": '{"type":"object","properties":{"code":{"type":"string","description":"股票代码，如000001"}},"required":["code"]}',
    "stock_rank": '{"type":"object","properties":{"type":{"type":"string","description":"排行类型","enum":["gainers","losers","amount"]},"limit":{"type":"number","description":"数量，默认10"}}}',
    "valuation_snapshot": '{"type":"object","properties":{"code":{"type":"string","description":"股票代码"}},"required":["code"]}',
    "limit_stats": '{"type":"object","properties":{}}',
    "limit_up_ladder": '{"type":"object","properties":{}}',
    "broken_limit_up": '{"type":"object","properties":{}}',
    "limit_down": '{"type":"object","properties":{}}',
    "limit_bigloser": '{"type":"object","properties":{}}',
    "limit_yesterday_premium": '{"type":"object","properties":{}}',
    "capital_flow": '{"type":"object","properties":{"type":{"type":"string","description":"可选sector返回板块资金排行","enum":["sector"]}}}',
    "concept_ranking": '{"type":"object","properties":{}}',
    "sector_analysis": '{"type":"object","properties":{}}',
    "review_history": '{"type":"object","properties":{"days":{"type":"number","description":"天数，默认20，最大60"}}}',
    "review_daily": '{"type":"object","properties":{"date":{"type":"string","description":"日期YYYY-MM-DD，默认最新交易日"}}}',
}

# Replace the tools/list handler to include input schemas
old_list = '''    const tools = Object.entries(ALL_TOOLS).map(([name, t]) => ({
      name, description: t.description,
      inputSchema: { type: "object", properties: {} },
    }));'''

new_list = '''    const TOOL_SCHEMAS: Record<string, any> = ''' + json.dumps(schemas, ensure_ascii=False, indent=4).replace('\n', '\n    ') + ''';
    const tools = Object.entries(ALL_TOOLS).map(([name, t]) => ({
      name, description: t.description,
      inputSchema: TOOL_SCHEMAS[name] ? JSON.parse(TOOL_SCHEMAS[name]) : { type: "object", properties: {} },
    }));'''

code = code.replace(old_list, new_list)

# Also fix the import to use npm:
code = code.replace(
    'import { createClient } from "https://esm.sh/@supabase/supabase-js@2";',
    'import { createClient } from "npm:@supabase/supabase-js@2";'
)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("P0 done - added tool schemas")
