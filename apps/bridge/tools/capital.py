"""Capital flow & sector tools: capital_flow, concept_ranking, sector_analysis"""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from ths_bridge_v3 import (
    _last_trade_date, _get_effective_date,
    _pg_exec, HAS_PG,
    _em_fund_flow_market, _sector_fund_flow_v2, _concept_fund_flow,
    _concept_ranking_mootdx, _concept_ranking_ths,
    log
)

def handle_capital_flow(args):
    dt = _get_effective_date()
    flow = _em_fund_flow_market()
    if flow:
        main = float(flow.get("mainNetInflow", 0)) / 1e8
        return f"[{dt}] 大盘主力净流入: {main:+.2f}亿"
    return "[资金] 资金流向数据不可用"

def handle_concept_ranking(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bc.concept_name as name, round(avg(dk.change_pct)::numeric, 2) as change_pct, "
            "count(*) as stock_cnt FROM daily_kline dk "
            "LEFT JOIN base_stock_concepts bsc ON dk.code = bsc.code "
            "LEFT JOIN base_concepts bc ON bsc.concept_id = bc.concept_id "
            "WHERE dk.trade_date=%s AND bc.concept_name IS NOT NULL AND bc.category='em' "
            "GROUP BY bc.concept_name ORDER BY change_pct DESC LIMIT 20", (dt,))
        if rows and len(rows) >= 3:
            items = [f"{r['name']}({float(r['change_pct'] or 0):+.2f}%)" for r in rows]
            return f"[{dt}] 概念前排: " + " | ".join(items[:15])
    data = _concept_ranking_mootdx()
    if data:
        items = [f"{d.get('name','')}({float(d.get('changePercent',0) or 0):+.2f}%)" for d in data[:15]]
        return f"[mootdx] 概念前排: " + " | ".join(items)
    return "暂无概念排行数据"

def handle_sector_analysis(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bs.industry as name, round(avg(dk.change_pct)::numeric, 2) as change_pct, "
            "count(*) as stock_cnt FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code = bs.code "
            "WHERE dk.trade_date=%s AND bs.industry IS NOT NULL AND bs.industry != '' "
            "GROUP BY bs.industry ORDER BY change_pct DESC LIMIT 20", (dt,))
        if rows:
            items = [f"{r['name']}({float(r['change_pct'] or 0):+.2f}%)" for r in rows]
            return f"[{dt}] 板块强度: " + " | ".join(items[:15])
    flow_data = _sector_fund_flow_v2()
    if flow_data:
        items = [f"{d.get('name','')}({float(d.get('changePercent',0) or 0):+.2f}%)" for d in flow_data[:15]]
        return f"[东方财富] 板块强度: " + " | ".join(items)
    return "暂无板块分析数据"

CAPITAL_TOOLS = {
    "capital_flow": {
        "description": "[资金] 大盘/板块/概念资金流向, type=market/sector/concept, 来源东方财富",
        "handler": handle_capital_flow,
    },
    "concept_ranking": {
        "description": "[资金] 概念题材涨幅排行(含成分股数量),从PG基表计算,成分股50+只才有统计意义",
        "handler": handle_concept_ranking,
    },
    "sector_analysis": {
        "description": "[资金] 板块强度分析(涨幅+资金流),含持续性判断",
        "handler": handle_sector_analysis,
    },
}
