# -*- coding: utf-8 -*-
"""
stats_calc.py — 每日复盘统计计算
用法: python stats_calc.py 2026-07-10
      从 daily_* 原始表 → 计算 stats_* 3张表
"""
import sys, psycopg2

DB = dict(host="localhost", port=5432, dbname="quicktiny", user="quicktiny", password="quicktiny123")

def calc(trade_date):
    """计算指定日期的所有统计指标"""
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()
    
    prev_date = None  # TODO: get previous trading day
    
    print(f"[stats_calc] 计算 {trade_date} 复盘数据...")
    
    # ═══ 1. 情绪总览 ═══
    print("  1/3 情绪总览...")
    
    # 涨停数、封板率、晋级率 — 需要 daily_limit_up 有数据
    cur.execute("""
        INSERT INTO stats_market_sentiment (trade_date)
        VALUES (%s)
        ON CONFLICT (trade_date) DO NOTHING
    """, (trade_date,))
    
    # 如果 daily_limit_up 有数据，计算各指标
    cur.execute("SELECT count(*) FROM daily_limit_up WHERE trade_date=%s", (trade_date,))
    lu_cnt = cur.fetchone()[0]
    
    if lu_cnt > 0:
        cur.execute("""
            UPDATE stats_market_sentiment SET
                limit_up_cnt = (SELECT count(*) FROM daily_limit_up WHERE trade_date=%s),
                max_board = COALESCE((SELECT max(continue_num) FROM daily_limit_up WHERE trade_date=%s), 0)
            WHERE trade_date = %s
        """, (trade_date, trade_date, trade_date))
    
    # 跌停数
    cur.execute("SELECT count(*) FROM daily_limit_down WHERE trade_date=%s", (trade_date,))
    ld_cnt = cur.fetchone()[0]
    cur.execute("UPDATE stats_market_sentiment SET limit_down_cnt=%s WHERE trade_date=%s", (ld_cnt, trade_date))
    
    # 大面股: 日内跌>10% (从 daily_kline 算)
    cur.execute("""
        UPDATE stats_market_sentiment SET big_loss_cnt = (
            SELECT count(*) FROM daily_kline 
            WHERE trade_date=%s AND change_pct <= -10
        ) WHERE trade_date=%s
    """, (trade_date, trade_date))
    
    # 晋级率 — 需要昨天也有数据
    cur.execute("SELECT count(*) FROM daily_limit_up WHERE trade_date=%s", (trade_date,))
    if cur.fetchone()[0] > 0:
        yesterday = None
        cur.execute("SELECT trade_date FROM daily_limit_up WHERE trade_date < %s ORDER BY trade_date DESC LIMIT 1", (trade_date,))
        row = cur.fetchone()
        if row:
            yesterday = row[0]
            # 1进2: (今天2板数 / 昨天1板数)
            cur.execute("SELECT count(*) FROM daily_limit_up WHERE trade_date=%s AND continue_num=1", (yesterday,))
            y1 = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM daily_limit_up WHERE trade_date=%s AND continue_num=2", (trade_date,))
            t2 = cur.fetchone()[0]
            r12 = (t2 / y1 * 100) if y1 > 0 else 0
            
            # 2进3
            cur.execute("SELECT count(*) FROM daily_limit_up WHERE trade_date=%s AND continue_num=2", (yesterday,))
            y2 = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM daily_limit_up WHERE trade_date=%s AND continue_num=3", (trade_date,))
            t3 = cur.fetchone()[0]
            r23 = (t3 / y2 * 100) if y2 > 0 else 0
            
            cur.execute("UPDATE stats_market_sentiment SET promo_1to2=%s, promo_2to3=%s WHERE trade_date=%s",
                        (r12, r23, trade_date))
    
    # 大盘数据
    cur.execute("""
        UPDATE stats_market_sentiment SET
            total_amount = (SELECT COALESCE(sum(amount),0) FROM daily_kline WHERE trade_date=%s)
        WHERE trade_date=%s
    """, (trade_date, trade_date))
    
    # ═══ 2. 连板天梯 ═══
    print("  2/3 连板天梯...")
    cur.execute("DELETE FROM stats_board_ladder WHERE trade_date=%s", (trade_date,))
    cur.execute("""
        INSERT INTO stats_board_ladder (trade_date, board_level, stock_cnt)
        SELECT %s, continue_num, count(*)
        FROM daily_limit_up WHERE trade_date=%s AND continue_num >= 1
        GROUP BY continue_num ORDER BY continue_num DESC
    """, (trade_date, trade_date))
    
    # ═══ 3. 板块强度 ═══
    print("  3/3 板块强度...")
    cur.execute("DELETE FROM stats_sector_strength WHERE trade_date=%s", (trade_date,))
    cur.execute("""
        INSERT INTO stats_sector_strength (trade_date, sector_code, sector_name, change_pct, limit_up_cnt, rank)
        SELECT %s, sector_code, sector_name, change_pct, limit_up_cnt,
               ROW_NUMBER() OVER (ORDER BY change_pct DESC) as rank
        FROM daily_sector WHERE trade_date=%s
        ORDER BY change_pct DESC
    """, (trade_date, trade_date))
    
    # 板块龙头
    cur.execute("""
        UPDATE stats_sector_strength s SET
            dragon_code = (
                SELECT dlu.code FROM daily_limit_up dlu
                JOIN base_stock_concepts bsc ON dlu.code = bsc.code
                JOIN base_concepts bc ON bsc.concept_id = bc.concept_id
                WHERE dlu.trade_date = s.trade_date AND bc.concept_name = s.sector_name
                ORDER BY dlu.continue_num DESC LIMIT 1
            )
        WHERE s.trade_date = %s
    """, (trade_date,))
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"[stats_calc] {trade_date} 计算完成!")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        calc(sys.argv[1])
    else:
        print("用法: python stats_calc.py 2026-07-10")
        print("或: python stats_calc.py today")
