
"""Capital flow & sector tools: capital_flow, concept_ranking, sector_analysis"""
import sys, os
sys.path.insert(0, r"D:\quicktiny")
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
        return f"[{dt}] ???????: {main:+.2f}?"
    return "[??] ?????????"

def handle_concept_ranking(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bc.concept_name as name, round(avg(dk.change_pct)::numeric, 2) as change_pct, "
            "count(*) as stock_cnt FROM daily_kline dk "
            "LEFT JOIN base_stock_concepts bsc ON dk.code = bsc.code "
            "LEFT JOIN base_concepts bc ON bsc.concept_id = bc.concept_id "
            "WHERE dk.trade_date=%s AND bc.concept_name IS NOT NULL "
            "GROUP BY bc.concept_name ORDER BY change_pct DESC LIMIT 20", (dt,))
        if rows and len(rows) >= 3:
            items = [f"{r['name']}({float(r['change_pct'] or 0):+.2f}%)" for r in rows]
            return f"[{dt}] ????: " + " | ".join(items[:15])
    data = _concept_ranking_mootdx()
    if data:
        items = [f"{d.get('name','')}({float(d.get('changePercent',0) or 0):+.2f}%)" for d in data[:15]]
        return f"[mootdx] ????: " + " | ".join(items)
    return "?????????"

def handle_sector_analysis(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bs.industry as name, round(avg(dk.change_pct)::numeric, 2) as change_pct, "
            "count(*) as stock_cnt FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code = bs.code "
            "WHERE dk.trade_date=%s AND bs.industry IS NOT NULL AND bs.industry != '' "
            "GROUP BY bs.industry ORDER BY change_pct DESC LIMIT 20", (dt,))
        if rows and len(rows) >= 3:
            items = [f"{r['name']}({float(r['change_pct'] or 0):+.2f}%)" for r in rows]
            return f"[{dt}] ????: " + " | ".join(items[:15])
    # Fallback to eastmoney fund flow
    flow_data = _sector_fund_flow_v2()
    if flow_data:
        items = [f"{d.get('name','')}({float(d.get('changePercent',0) or 0):+.2f}%)" for d in flow_data[:15]]
        return f"[???] ????: " + " | ".join(items)
    return "?????????"

CAPITAL_TOOLS = {
    "capital_flow": {
        "description": "[??] ??????????????=????,??=????????",
        "handler": handle_capital_flow,
    },
    "concept_ranking": {
        "description": "[??] ??????????(?????),?????????????????????",
        "handler": handle_concept_ranking,
    },
    "sector_analysis": {
        "description": "[??] ????????(??+?????)?????????",
        "handler": handle_sector_analysis,
    },
}
