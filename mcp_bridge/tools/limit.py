
"""Limit up/down tools: stats, ladder, bigloser, premium"""
import sys, os
sys.path.insert(0, r"D:\quicktiny")
from ths_bridge_v3 import (
    _last_trade_date, _get_effective_date, _is_trading_day,
    _pg_exec, HAS_PG, HAS_MOOTDX, _dx, log
)
from datetime import datetime

def _fmt_pct(v):
    try: return f"{float(v):+.2f}%"
    except: return "0.00%"

def handle_limit_stats(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct >= 9.8) as up_cnt, "
            "count(*) FILTER (WHERE change_pct <= -9.8) as down_cnt "
            "FROM daily_kline WHERE trade_date=%s", (dt,))
        if rows:
            up = rows[0]["up_cnt"] or 0
            down = rows[0]["down_cnt"] or 0
            return f"[{dt}] ??{up}? / ??{down}? / ??(?limit_up??)"
    return f"[{dt}] ????????"

def handle_limit_up_ladder(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT dlu.code, dlu.continue_num, dlu.limit_type, dlu.change_pct, "
            "dlu.turnover_rate, dlu.reason_info, bs.name, bs.industry "
            "FROM daily_limit_up dlu "
            "LEFT JOIN base_stocks bs ON dlu.code = bs.code "
            "WHERE dlu.trade_date = %s "
            "ORDER BY dlu.continue_num DESC LIMIT 100", (dt,))
        if rows:
            ladder = {}
            for r in rows:
                lv = r["continue_num"] or 1
                if lv not in ladder:
                    ladder[lv] = {"level": lv, "count": 0, "stocks": []}
                ladder[lv]["count"] += 1
                ladder[lv]["stocks"].append(
                    f"{r.get('name', r['code'])}({r['code']}) "
                    f"{_fmt_pct(r.get('change_pct', 0))} "
                    f"??{float(r.get('turnover_rate',0) or 0):.1f}% "
                    f"{r.get('limit_type','')} "
                    f"{r.get('reason_info') or ''}"
                )
            lines = [f"=== {dt} ???? ==="]
            for lv in sorted(ladder.keys(), reverse=True):
                l = ladder[lv]
                lines.append(f"{lv}?({l['count']}?): " + " | ".join(l["stocks"][:8]))
            return "\n".join(lines)
    return f"[{dt}] ???????"

def handle_broken_limit_up(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT count(*) as cnt FROM daily_kline "
            "WHERE trade_date=%s AND change_pct >= 5 AND change_pct < 9.8", (dt,))
        if rows:
            return f"[{dt}] ??(?): {rows[0]['cnt']}? (??5%-9.8%???)"
    return "???????"

def handle_limit_down(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code = bs.code "
            "WHERE dk.trade_date=%s AND dk.change_pct <= -9.8 LIMIT 30", (dt,))
        if rows:
            items = [f"{r['name']}({r['code']}) {_fmt_pct(r['change_pct'])}" for r in rows]
            return f"[{dt}] ???({len(items)}?): " + " | ".join(items)
    return "???????"

def handle_limit_bigloser(args):
    dt = _get_effective_date()
    result = []
    if HAS_PG and dt:
        # big losers (>10% drop)
        bl = _pg_exec(
            "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code = bs.code "
            "WHERE dk.trade_date=%s AND dk.change_pct <= -10", (dt,))
        if bl:
            items = [f"{r['name']}({r['code']}) {_fmt_pct(r['change_pct'])}" for r in bl]
            result.append(f"???(?>10%): " + " | ".join(items[:10]) if items else "0?")
        else:
            result.append("???: 0?")
        # nuclear buttons
        yest = _last_trade_date()
        if yest and yest != dt:
            nb = _pg_exec(
                "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
                "LEFT JOIN base_stocks bs ON dk.code = bs.code "
                "WHERE dk.trade_date=%s AND dk.change_pct <= -9.8 "
                "AND dk.code IN (SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if nb:
                items = [f"{r['name']}({r['code']}) {_fmt_pct(r['change_pct'])}" for r in nb]
                result.append("???(??????): " + " | ".join(items[:10]))
            else:
                result.append("???: 0?")
    return "\n".join(result) if result else "???/????????"

def handle_limit_yesterday_premium(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        yest_rows = _pg_exec("SELECT max(trade_date) FROM daily_kline WHERE trade_date < %s", (dt,))
        if yest_rows:
            yest = str(yest_rows[0]["max"])
            rows = _pg_exec(
                "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
                "LEFT JOIN base_stocks bs ON dk.code = bs.code "
                "WHERE dk.trade_date=%s AND dk.code IN "
                "(SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if rows:
                returns = [float(r["change_pct"] or 0) for r in rows]
                avg = sum(returns) / len(returns) if returns else 0
                top = sorted(returns, reverse=True)[:5]
                bot = sorted(returns)[:5]
                return (f"[{dt}] ???({yest})?????: {avg:+.2f}% ({len(returns)}?)\n"
                        f"??: {top}\n??: {bot}")
    return "??????????"

LIMIT_TOOLS = {
    "limit_stats": {
        "description": "[??] ???????: ???/???/??????????",
        "handler": handle_limit_stats,
    },
    "limit_up_ladder": {
        "description": "[??] ??????: ?????(6?/5?/4?...)???????,?????????????",
        "handler": handle_limit_up_ladder,
    },
    "broken_limit_up": {
        "description": "[??] ?????: ???????????,?????????",
        "handler": handle_broken_limit_up,
    },
    "limit_down": {
        "description": "[??] ?????: ????????,???????",
        "handler": handle_limit_down,
    },
    "limit_bigloser": {
        "description": "[??] ?????(??>10%)????(????????)????????????",
        "handler": handle_limit_bigloser,
    },
    "limit_yesterday_premium": {
        "description": "[??] ???????????????????: >2%???, <0%??????????",
        "handler": handle_limit_yesterday_premium,
    },
}
