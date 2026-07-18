# Supabase 迁移指南
# ================

# 1. 创建 Supabase 项目
#    访问 https://supabase.com → New Project → 记住密码

# 2. 获取连接字符串
#    Supabase Dashboard → Settings → Database → Connection String → URI
#    格式: postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-xxxx.pooler.supabase.com:6543/postgres

# 3. 在项目根目录创建 .env 文件（不提交）
#    cp .env.example .env → 填入真实值

# 4. 导入 schema
#    psql "$DATABASE_URL" -f supabase_schema.sql

# 5. 导入数据（从 Docker 导出）
#    docker exec quicktiny-pg pg_dump -U quicktiny -d quicktiny --data-only --table=daily_kline --table=daily_limit_up --table=base_stocks --table=base_concepts --table=base_stock_concepts > data_export.sql
#    psql "$DATABASE_URL" -f data_export.sql

# 6. 重启 bridge
#    python apps/bridge/main.py
