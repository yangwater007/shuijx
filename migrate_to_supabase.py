# -*- coding: utf-8 -*-
"""
migrate_to_supabase.py — 从 Docker PG 迁移数据到 Supabase
=========================================================
用法:
  1. 在 .env 中设置 SUPABASE_URL (目标)
  2. python migrate_to_supabase.py

只迁移有数据的6张表，跳过空表。
"""

import sys, os
sys.path.insert(0, r"D:\quicktiny")

# Source: Docker PG
import psycopg2, psycopg2.extras

SRC = "postgresql://quicktiny:quicktiny123@localhost:5432/quicktiny"
DST = os.getenv("SUPABASE_URL") or os.getenv("DATABASE_URL")

if not DST:
    print("ERROR: 请设置 SUPABASE_URL 或 DATABASE_URL 环境变量")
    print("  例如: set SUPABASE_URL=postgresql://postgres.xxx:pass@aws-0-xxx.supabase.com:6543/postgres")
    sys.exit(1)

if "localhost" in DST or "127.0.0.1" in DST:
    print("ERROR: DATABASE_URL 指向本地，请设置为 Supabase 地址")
    sys.exit(1)

print(f"源: {SRC}")
print(f"目标: {DST[:60]}...")
print()

TABLES = [
    "base_stocks",
    "base_concepts",
    "base_stock_concepts",
    "daily_kline",
    "daily_limit_up",
    "realtime_timeshare",
]

src = psycopg2.connect(dsn=SRC)
dst = psycopg2.connect(dsn=DST)

# 1. Create schema (from supabase_schema.sql)
print("[1/3] 创建表结构...")
with open(r"D:\quicktiny\supabase_schema.sql", "r", encoding="utf-8") as f:
    schema = f.read()
# Remove pg_dump specific lines
import re
schema = re.sub(r'^--.*\n?', '', schema, flags=re.MULTILINE)
schema = re.sub(r'^SET .*;\n?', '', schema, flags=re.MULTILINE)
schema = re.sub(r'^SELECT .*;\n?', '', schema, flags=re.MULTILINE)
schema = re.sub(r'^\\\.\n?', '', schema, flags=re.MULTILINE)
schema = '\n'.join(line for line in schema.split('\n') if line.strip())
# Execute each statement
for stmt in schema.split(';'):
    stmt = stmt.strip()
    if stmt:
        try:
            with dst.cursor() as cur:
                cur.execute(stmt)
            dst.commit()
        except Exception as e:
            dst.rollback()
            if "already exists" not in str(e):
                print(f"  SKIP: {str(e)[:80]}")

print("[2/3] 迁移数据...")
for table in TABLES:
    # Count source rows
    with src.cursor() as cur:
        cur.execute(f"SELECT count(*) FROM {table}")
        count = cur.fetchone()[0]
    
    if count == 0:
        print(f"  {table}: 0 rows (skip)")
        continue
    
    # Copy with COPY protocol
    with src.cursor() as scur, dst.cursor() as dcur:
        # Export to temp file and import
        import tempfile, subprocess
        tmp = tempfile.NamedTemporaryFile(suffix='.csv', delete=False)
        tmp.close()
        
        scur.copy_expert(f"COPY (SELECT * FROM {table}) TO STDOUT WITH CSV HEADER", open(tmp.name, 'w'))
        
        # Disable FK checks temporarily
        dcur.execute("SET session_replication_role = 'replica'")
        with open(tmp.name, 'r') as f:
            dcur.copy_expert(f"COPY {table} FROM STDIN WITH CSV HEADER", f)
        dcur.execute("SET session_replication_role = 'origin'")
        dst.commit()
        
        os.unlink(tmp.name)
    
    print(f"  {table}: {count} rows -> OK")

# 3. Update sequences
print("[3/3] 更新序列...")
with dst.cursor() as cur:
    for table in TABLES:
        try:
            cur.execute(f"SELECT setval('{table}_id_seq', COALESCE((SELECT max(id) FROM {table}), 0))")
        except:
            pass  # Some tables may not have id_seq
dst.commit()

src.close()
dst.close()
print("\n迁移完成!")
