"""
sync_kline_v2.py - 从同花顺批量同步K线到Supabase（健壮版）
优化: 逐股提交、断线重连、跳过已知无效代码
"""
import psycopg2, json, ssl, urllib.request, sys, time
from datetime import date, timedelta

POOLER_URL = "postgresql://postgres.qzqpymvboltyvddpmpct:UNqPsVDtDQ27jtD1@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
THS_BASE = "https://d.10jqka.com.cn/v2/line"

def get_prefix(code):
    if code.startswith("6"): return "hs"
    if code[0] in "023": return "sz"
    return "hs"

def fetch_jsonp(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        text = resp.read().decode("gbk", errors="replace")
    start = text.find("(") + 1
    end = text.rfind(")")
    return json.loads(text[start:end])

def sync_stock(cur, conn, code, name, lookback_days=60):
    try:
        prefix = get_prefix(code)
        url = f"{THS_BASE}/{prefix}_{code}/01/last.js"
        data = fetch_jsonp(url)
        raw = data.get("data", "")
        if not raw:
            return 0
        lines = raw.split(";")
        cutoff = (date.today() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
        
        rows = []
        for line in lines:
            if not line.strip(): continue
            p = line.split(",")
            if len(p) < 8: continue
            dt = p[0]
            if dt < cutoff: continue
            try:
                rows.append((
                    code, dt,
                    float(p[1]), float(p[2]), float(p[3]), float(p[4]),
                    int(float(p[5])), float(p[6]),
                    0,   # change_pct will be computed via SQL
                    float(p[9]) if len(p) > 9 and p[9] else (float(p[8]) if len(p) > 8 and p[8] else 0),
                ))
            except (ValueError, IndexError):
                continue
        
        if not rows: return 0
        
        # Single stock insert to avoid large transactions
        from psycopg2.extras import execute_values
        execute_values(cur, """
            INSERT INTO daily_kline (code, trade_date, open, high, low, close, volume, amount, change_pct, turnover)
            VALUES %s
            ON CONFLICT (code, trade_date) DO UPDATE SET
                open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low,
                close=EXCLUDED.close, volume=EXCLUDED.volume, amount=EXCLUDED.amount,
                change_pct=EXCLUDED.change_pct, turnover=EXCLUDED.turnover
        """, rows)
        conn.commit()
        return len(rows)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return -1  # skip this code permanently
        return 0
    except Exception as e:
        err = str(e)
        if "transaction is aborted" in err or "already closed" in err:
            raise  # caller reconnects
        return 0

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=15)
    parser.add_argument("--skip", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--prefix", type=str, default="")
    args = parser.parse_args()
    
    conn = psycopg2.connect(POOLER_URL, connect_timeout=10)
    cur = conn.cursor()
    
    # Get stocks, optionally filtered by prefix
    if args.prefix:
        cur.execute("SELECT code, name FROM base_stocks WHERE code LIKE %s ORDER BY code", (args.prefix + "%",))
    else:
        cur.execute("SELECT code, name FROM base_stocks ORDER BY code")
    codes = cur.fetchall()
    
    if args.skip > 0:
        codes = codes[args.skip:]
    if args.limit > 0:
        codes = codes[:args.limit]
    
    total_rows = 0
    success = 0
    skipped = 0
    errors = 0
    consecutive_errors = 0
    t0 = time.time()
    
    for i, (code, name) in enumerate(codes):
        try:
            result = sync_stock(cur, conn, code, name, args.days)
            if result > 0:
                success += 1
                total_rows += result
                consecutive_errors = 0
            elif result == -1:
                skipped += 1
                consecutive_errors = 0
            else:
                consecutive_errors += 1
        except Exception as e:
            errors += 1
            consecutive_errors += 1
            # Reconnect on connection errors
            try:
                cur.close(); conn.close()
            except: pass
            time.sleep(1)
            conn = psycopg2.connect(POOLER_URL, connect_timeout=10)
            cur = conn.cursor()
        
        if (i + 1) % 500 == 0 or (i+1) == len(codes):
            elapsed = time.time() - t0
            rate = (i+1) / elapsed if elapsed > 0 else 0
            eta = (len(codes) - i - 1) / rate if rate > 0 else 0
            print(f"[{i+1}/{len(codes)}] +{success} stocks, {total_rows} rows | {skipped} skipped | {consecutive_errors} errs | {rate:.1f}/s | ETA {eta:.0f}s")
        
        if consecutive_errors > 50:
            print(f"Too many consecutive errors ({consecutive_errors}), skipping ahead...")
            consecutive_errors = 0
    
    elapsed = time.time() - t0
    print(f"\nDone! {success} stocks synced ({total_rows} rows), {skipped} skipped, {errors} errors in {elapsed:.0f}s")
    cur.close(); conn.close()

if __name__ == "__main__":
    main()
