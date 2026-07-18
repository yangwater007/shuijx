"""Market data tools: overview, kline, minute, stock_rank, valuation"""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from ths_bridge_v3 import (
    _market_overview, _fetch_kline_source, _fetch_minute_source,
    _fetch_quote_source, _last_trade_date, _get_effective_date, _is_trading_day,
    _http, _mkt_ths, _mkt_tx, _mkt_mootdx,
    _pg_exec, HAS_PG, HAS_MOOTDX, _dx, log
)

def handle_market_overview(args):
    dt = _get_effective_date()
    up = down = flat = 0
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct > 0) as up, "
            "count(*) FILTER (WHERE change_pct < 0) as down, "
            "count(*) FILTER (WHERE change_pct = 0) as flat "
            "FROM daily_kline WHERE trade_date=%s", (dt,))
        if rows:
            up = rows[0]["up"] or 0
            down = rows[0]["down"] or 0
            flat = rows[0]["flat"] or 0
    data = _market_overview()
    indices = data.get("indices", [])
    lines = [f"=== A股市场全景 ({dt}) ==="]
    lines.append(f"上涨 {up}家 / 下跌 {down}家 / 平盘 {flat}家")
    for idx in indices:
        sign = "+" if float(idx.get("changePercent", 0)) >= 0 else ""
        lines.append(f"{idx.get('name')}: {idx.get('price')} {sign}{idx.get('changePercent')}%")
    return "\n".join(lines)

def handle_kline(args):
    code = args.get("code", "")
    count = int(args.get("days", 60))
    data, src = _fetch_kline_source(code, count)
    if not data: return f"[{src}] K线无数据"
    last = data[-1]
    return f"[{src}] {code} K线({len(data)}条): OHLC={last.get('open')}/{last.get('high')}/{last.get('low')}/{last.get('close')} vol={last.get('volume')}"

def handle_minute_data(args):
    code = args.get("code", "")
    data, src = _fetch_minute_source(code)
    if not data: return f"[{src}] 暂无分时数据"
    last = data[-1]
    return f"[{src}] {code} 分时({len(data)}条): 最新价={last.get('price')} 时间={last.get('time')}"

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
    return f"[{rank_type}] 暂无数据"

def handle_valuation_snapshot(args):
    code = args.get("code", "")
    try:
        mkt = _mkt_tx(code)
        r = _http(f"https://qt.gtimg.cn/q={mkt}{code}", encoding="gbk")
        if r:
            inner = r.text.split('="', 1)[1].rstrip('";\n')
            flds = inner.split("~")
            if len(flds) > 45:
                return f"[腾讯] {code} PE={flds[39]} PB={flds[46] if len(flds)>46 else '-'} 市值={flds[45]}亿"
    except: pass
    return f"[腾讯] {code} 暂无估值数据"

MARKET_TOOLS = {
    "market_overview": {
        "description": "[行情] 全市场行情总览：涨跌家数(来自PG全市场覆盖)、四大指数(上证/深证/创业板/科创50)",
        "handler": handle_market_overview,
    },
    "kline": {
        "description": "[行情] 个股日线K线(OHLC+成交量+成交额), 四级回退数据源。参数: code(股票代码), days(天数,默认60)",
        "handler": handle_kline,
    },
    "minute_data": {
        "description": "[行情] 个股当日分时数据(实时价格+时间)。参数: code(股票代码)",
        "handler": handle_minute_data,
    },
    "stock_rank": {
        "description": "[行情] 个股涨幅/跌幅/成交额排行。type: gainers/losers/amount, limit: 默认10",
        "handler": handle_stock_rank,
    },
    "valuation_snapshot": {
        "description": "[行情] 个股估值快照: PE/PB/市值。参数: code(股票代码)",
        "handler": handle_valuation_snapshot,
    },
}
