"""Limit up/down tools: stats, ladder, broken, down, bigloser, premium"""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

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
        up_rows = _pg_exec("SELECT count(*) as c FROM daily_limit_up WHERE trade_date=%s", (dt,))
        up = up_rows[0]["c"] if up_rows else 0
        down_rows = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct <= -9.8) as down_cnt "
            "FROM daily_kline WHERE trade_date=%s", (dt,))
        down = down_rows[0]["down_cnt"] if down_rows else 0
        broken_rows = _pg_exec(
            "SELECT count(*) as c FROM daily_limit_up "
            "WHERE trade_date=%s AND open_count > 0", (dt,))
        broken = broken_rows[0]["c"] if broken_rows else 0
        return f"[{dt}] 涨停{up}只 / 跌停{down}只 / 炸板{broken}只(开板>0)"
    return f"[{dt}] 非交易日,无数据"

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
                    f"换{float(r.get('turnover_rate',0) or 0):.1f}% "
                    f"{r.get('limit_type','')} "
                    f"{r.get('reason_info') or ''}"
                )
            lines = [f"=== {dt} 涨停梯队 ==="]
            for lv in sorted(ladder.keys(), reverse=True):
                l = ladder[lv]
                lines.append(f"{lv}板({l['count']}只): " + " | ".join(l["stocks"][:8]))
            return "\n".join(lines)
    return f"[{dt}] 非交易日,无涨停数据"

def handle_broken_limit_up(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        broken_rows = _pg_exec(
            "SELECT code, open_count FROM daily_limit_up "
            "WHERE trade_date=%s AND open_count > 0 ORDER BY open_count DESC LIMIT 20", (dt,))
        if broken_rows:
            total = len(broken_rows)
            items = [f"{r['code']}(开板{r['open_count']}次)" for r in broken_rows[:10]]
            return f"[{dt}] 炸板共{total}只: " + " | ".join(items)
        return f"[{dt}] 炸板: 0只(无开板记录)"
    return "非交易日,无数据"

def handle_limit_down(args):
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code = bs.code "
            "WHERE dk.trade_date=%s AND dk.change_pct <= -9.8 LIMIT 30", (dt,))
        if rows:
            items = [f"{r['name']}({r['code']}) {_fmt_pct(r['change_pct'])}" for r in rows]
            return f"[{dt}] 跌停({len(items)}只): " + " | ".join(items)
    return "暂无跌停数据"

def handle_limit_bigloser(args):
    dt = _get_effective_date()
    result = []
    if HAS_PG and dt:
        bl = _pg_exec(
            "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code = bs.code "
            "WHERE dk.trade_date=%s AND dk.change_pct <= -10", (dt,))
        if bl:
            items = [f"{r['name']}({r['code']}) {_fmt_pct(r['change_pct'])}" for r in bl]
            result.append(f"大面股(跌>10%): " + (" | ".join(items[:10]) if items else "0只"))
        else:
            result.append("大面股: 0只")
        yest = _last_trade_date()
        if yest and yest != dt:
            nb = _pg_exec(
                "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
                "LEFT JOIN base_stocks bs ON dk.code = bs.code "
                "WHERE dk.trade_date=%s AND dk.change_pct <= -9.8 "
                "AND dk.code IN (SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if nb:
                items = [f"{r['name']}({r['code']}) {_fmt_pct(r['change_pct'])}" for r in nb]
                result.append("核按钮(昨日涨停今日跌停): " + (" | ".join(items[:10])))
            else:
                result.append("核按钮: 0只")
    return "\n".join(result) if result else "大面股/核按钮: 暂无数据"

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
                return (f"[{dt}] 昨涨停({yest})今日溢价: {avg:+.2f}% ({len(returns)}只)\n"
                        f"最佳: {top}\n最差: {bot}")
    return "昨涨停溢价: 暂无数据"

LIMIT_TOOLS = {
    "limit_stats": {
        "description": "[涨停] 涨停生态统计: 封住涨停数/跌停数/炸板数(开板>0),来源daily_limit_up+daily_kline",
        "handler": handle_limit_stats,
    },
    "limit_up_ladder": {
        "description": "[涨停] 涨停梯队: 按连板数降序(6板/5板/4板...)列出股票代码+涨停原因+题材",
        "handler": handle_limit_up_ladder,
    },
    "broken_limit_up": {
        "description": "[涨停] 炸板池: 涨停打开过的股票,包含开板次数,用于判断封板强度",
        "handler": handle_broken_limit_up,
    },
    "limit_down": {
        "description": "[涨停] 跌停池: 当日跌停股票列表,标注跌幅",
        "handler": handle_limit_down,
    },
    "limit_bigloser": {
        "description": "[涨停] 大面股(跌幅>10%)和核按钮(昨日涨停今日跌停),反映亏钱效应",
        "handler": handle_limit_bigloser,
    },
    "limit_yesterday_premium": {
        "description": "[涨停] 昨日涨停今日溢价: 接力环境核心指标, >2%强势, <0%亏钱效应明显",
        "handler": handle_limit_yesterday_premium,
    },
}
