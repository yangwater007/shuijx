
"""Market data tools: overview, kline, minute, stock_rank, valuation"""
import json, sys, os
sys.path.insert(0, r"D:\quicktiny")

# Reuse bridge internals
from ths_bridge_v3 import (
    _market_overview, _fetch_kline_source, _fetch_minute_source,
    _fetch_quote_source, _last_trade_date, _get_effective_date, _is_trading_day,
    _http, _mkt_ths, _mkt_tx, _mkt_mootdx,
    _pg_exec, HAS_PG, HAS_MOOTDX, _dx, log
)

def handle_market_overview(args):
    data = _market_overview()
    dt = _get_effective_date()
    indices = data.get("indices", [])
    lines = [f"=== ???? ({dt}) ==="]
    lines.append(f"?? {data.get('up',0)} / ?? {data.get('down',0)} / ?? {data.get('flat',0)}")
    for idx in indices:
        sign = "+" if float(idx.get("changePercent", 0)) >= 0 else ""
        lines.append(f"{idx.get('name')}: {idx.get('price')} {sign}{idx.get('changePercent')}%")
    return "\n".join(lines)

def handle_kline(args):
    code = args.get("code", "")
    count = int(args.get("days", 60))
    data, src = _fetch_kline_source(code, count)
    if not data: return f"[{src}] K?????"
    last = data[-1]
    return f"[{src}] {code} K?({len(data)}?): ?? OHLC={last.get('open')}/{last.get('high')}/{last.get('low')}/{last.get('close')} ?={last.get('volume')}"

def handle_minute_data(args):
    code = args.get("code", "")
    data, src = _fetch_minute_source(code)
    if not data: return f"[{src}] ??????"
    last = data[-1]
    return f"[{src}] {code} ??({len(data)}?): ???={last.get('price')} ??={last.get('time')}"

def handle_stock_rank(args):
    rank_type = args.get("type", "gainers")
    limit = int(args.get("limit", 10))
    dt = _get_effective_date()
    if HAS_PG:
        order = "DESC" if rank_type == "gainers" else "ASC"
        rows = _pg_exec(
            f"SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
            f"LEFT JOIN base_stocks bs ON dk.code = bs.code "
            f"WHERE dk.trade_date = %s ORDER BY dk.change_pct {order} LIMIT %s",
            (dt, limit))
        if rows:
            items = [f"{r['name']}({r['code']}) {float(r['change_pct'] or 0):+.2f}%" for r in rows]
            return f"[{dt}] {rank_type}: " + " | ".join(items)
    return f"[{rank_type}] ?????"

def handle_valuation_snapshot(args):
    code = args.get("code", "")
    try:
        mkt = _mkt_tx(code)
        r = _http(f"https://qt.gtimg.cn/q={mkt}{code}", encoding="gbk")
        if r:
            inner = r.text.split('="', 1)[1].rstrip('";\n')
            flds = inner.split("~")
            if len(flds) > 45:
                return f"[??] {code} PE={flds[39]} PB={flds[46] if len(flds)>46 else '-'} ??={flds[45]}?"
    except: pass
    return f"[??] {code} ?????"

MARKET_TOOLS = {
    "market_overview": {
        "description": "[??] ??????????????(??/??/???/??50)??????????",
        "handler": handle_market_overview,
    },
    "kline": {
        "description": "[??] ?????K?(OHLC+???+???), ????????????????: code(????), days(??,??60), adjust(none/qfq)",
        "handler": handle_kline,
    },
    "minute_data": {
        "description": "[??] ??????????????????: code(????)",
        "handler": handle_minute_data,
    },
    "stock_rank": {
        "description": "[??] ???????/???/?????type: gainers/losers/amount, limit: ????10",
        "handler": handle_stock_rank,
    },
    "valuation_snapshot": {
        "description": "[??] ????????: PE/PB/?????: code(????)",
        "handler": handle_valuation_snapshot,
    },
}
