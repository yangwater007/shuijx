"""Review tools: 20-day history + daily full review"""
import sys, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from ths_bridge_v3 import _last_trade_date, _get_effective_date, _pg_exec, HAS_PG, log

def handle_review_history(args):
    days = min(int(args.get("days", 20)), 60)
    if HAS_PG:
        rows = _pg_exec(
            "SELECT trade_date, count(*) FILTER (WHERE change_pct >= 9.8) as up_cnt, "
            "count(*) FILTER (WHERE change_pct <= -9.8) as down_cnt, "
            "round(avg(change_pct)::numeric, 2) as avg_pct, sum(amount) as total_amount "
            "FROM daily_kline "
            "WHERE trade_date >= (SELECT max(trade_date) FROM daily_kline) - INTERVAL '%s days' "
            "GROUP BY trade_date ORDER BY trade_date DESC LIMIT %s", (days*2, days))
        if rows:
            lines = [f"=== {days}日复盘历史 ==="]
            for r in rows:
                d = str(r["trade_date"])[:10]
                lines.append(f"{d} 涨{int(r['up_cnt'] or 0)} 跌{int(r['down_cnt'] or 0)} 均涨{float(r['avg_pct'] or 0):+.2f}%")
            return "\n".join(lines)
    return "暂无历史数据"

def handle_review_daily(args):
    target = args.get("date", "") or _get_effective_date()
    if HAS_PG and target:
        lines = [f"=== {target} 每日复盘 ==="]
        er = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct >= 9.8) as up, "
            "count(*) FILTER (WHERE change_pct <= -9.8) as down, sum(amount) as amt "
            "FROM daily_kline WHERE trade_date=%s", (target,))
        if er:
            lines.append(f"涨停{er[0]['up'] or 0} 跌停{er[0]['down'] or 0} 成交{float(er[0]['amt'] or 0)/1e12:.2f}万亿")
        lr = _pg_exec(
            "SELECT dlu.code, dlu.continue_num, bs.name FROM daily_limit_up dlu "
            "LEFT JOIN base_stocks bs ON dlu.code = bs.code "
            "WHERE dlu.trade_date=%s ORDER BY dlu.continue_num DESC", (target,))
        if lr:
            ladder = {}
            for r in lr:
                lv = r["continue_num"] or 1
                ladder.setdefault(lv, {"level": lv, "names": []})
                ladder[lv]["names"].append(r.get("name", r["code"]))
            for lv in sorted(ladder, reverse=True):
                lines.append(f"{lv}板: {', '.join(ladder[lv]['names'][:10])}")
        return "\n".join(lines)
    return "暂无复盘数据"

REVIEW_TOOLS = {
    "review_history": {
        "description": "[复盘] 近N日(默认20天)市场复盘: 涨跌停/均涨幅/成交额, 用于情绪周期判断",
        "handler": handle_review_history,
    },
    "review_daily": {
        "description": "[复盘] 单日完整复盘: 市场情绪+连板梯队+主线题材。参数: date(YYYY-MM-DD)",
        "handler": handle_review_daily,
    },
}
