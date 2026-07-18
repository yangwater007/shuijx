# -*- coding: utf-8 -*-
"""
sync_kline.py — 全市场K线批量同步脚本
======================================
从 mootdx→同花顺→腾讯→新浪 四级回退获取所有A股K线数据
多线程并发（20线程），存入 PostgreSQL daily_kline 表

用法: python sync_kline.py [--days 20] [--workers 20]
"""

import sys, os, time, json, logging, argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta

sys.path.insert(0, r"D:\quicktiny")
logging.basicConfig(level=logging.INFO, format="[SYNC] %(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("sync")

# ---- 复用 bridge 的获取逻辑 ----
from ths_bridge_v3 import (
    _fetch_kline_source, _pg_exec, HAS_PG, HAS_MOOTDX, _dx,
    _last_trade_date, _is_trading_day, _get_effective_date
)

def get_a_share_codes():
    """获取所有A股代码（0/3/6开头）"""
    rows = _pg_exec("SELECT code, name FROM base_stocks WHERE code ~ '^[036]' ORDER BY code")
    return [(r["code"], r["name"]) for r in rows] if rows else []

def sync_one_stock(code, name, days):
    """同步单只股票的K线，返回 (success, count)"""
    try:
        data, src = _fetch_kline_source(code, days)
        if not data or len(data) == 0:
            return (False, 0, src)

        # 批量 upsert
        inserted = 0
        for row in data:
            dt = row.get("date", "")[:10]
            if not dt or len(dt) < 8:
                continue
            try:
                o = float(row.get("open", 0))
                h = float(row.get("high", 0))
                l = float(row.get("low", 0))
                c = float(row.get("close", 0))
                v = int(float(row.get("volume", 0)))
                amt = float(row.get("amount", 0))
                chg = round((c - o) / o * 100, 4) if o > 0 else 0
            except (ValueError, ZeroDivisionError):
                continue

            _pg_exec(
                """INSERT INTO daily_kline (code, trade_date, open, high, low, close, volume, amount, change_pct)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT (code, trade_date) DO UPDATE SET
                     open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
                     close=EXCLUDED.close, volume=EXCLUDED.volume, amount=EXCLUDED.amount,
                     change_pct=EXCLUDED.change_pct""",
                (code, dt, o, h, l, c, v, amt, chg)
            )
            inserted += 1
        return (True, inserted, src)
    except Exception as e:
        return (False, 0, str(e)[:50])

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=20, help="同步天数")
    parser.add_argument("--workers", type=int, default=20, help="并发线程数")
    parser.add_argument("--limit", type=int, default=0, help="限制股票数(0=全部)")
    parser.add_argument("--skip-existing", action="store_true", help="跳过已有数据的股票")
    args = parser.parse_args()

    if not HAS_PG:
        log.error("PostgreSQL 不可用，退出")
        return

    codes = get_a_share_codes()
    total = len(codes)
    log.info(f"共 {total} 只A股待处理")

    if args.skip_existing:
        # 查询已有数据的股票
        dt = _last_trade_date()
        existing = set()
        if dt:
            rows = _pg_exec("SELECT DISTINCT code FROM daily_kline WHERE trade_date=%s", (dt,))
            existing = {r["code"] for r in rows} if rows else set()
        codes = [(c, n) for c, n in codes if c not in existing]
        log.info(f"跳过 {total - len(codes)} 只已有数据，剩余 {len(codes)} 只")

    if args.limit > 0:
        codes = codes[:args.limit]
        log.info(f"限制为 {len(codes)} 只")

    success = 0
    failed = 0
    total_rows = 0
    sources = {}
    start = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(sync_one_stock, c, n, args.days): (c, n)
            for c, n in codes
        }

        for i, f in enumerate(as_completed(futures)):
            c, n = futures[f]
            try:
                ok, cnt, src = f.result()
                if ok:
                    success += 1
                    total_rows += cnt
                    sources[src] = sources.get(src, 0) + 1
                else:
                    failed += 1
            except Exception as e:
                failed += 1

            # 每100只输出进度
            done = i + 1
            if done % 100 == 0 or done == len(codes):
                elapsed = time.time() - start
                rate = done / elapsed if elapsed > 0 else 0
                eta = (len(codes) - done) / rate if rate > 0 else 0
                log.info(f"进度: {done}/{len(codes)} ({done*100//len(codes)}%) | "
                        f"成功:{success} 失败:{failed} | "
                        f"速度:{rate:.1f}只/秒 | ETA:{eta:.0f}秒")

    elapsed = time.time() - start
    log.info("=" * 60)
    log.info(f"同步完成! 耗时 {elapsed:.1f}秒")
    log.info(f"成功: {success} 只, 失败: {failed} 只, 总行数: {total_rows}")
    log.info(f"数据源分布: {sources}")
    log.info(f"日均: {total_rows}/{args.days}={total_rows//max(args.days,1)} 只/天")

if __name__ == "__main__":
    main()
