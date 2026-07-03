-- ============================================================
-- Stock Platform — PostgreSQL 初始化脚本
-- ============================================================

-- 1. 股票基本信息表
CREATE TABLE IF NOT EXISTS stocks (
    code        VARCHAR(10) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    market      CHAR(2) NOT NULL DEFAULT 'SH',  -- SH/SZ/BJ
    industry    VARCHAR(50),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. 日K线数据表
CREATE TABLE IF NOT EXISTS kline_daily (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
    trade_date  DATE NOT NULL,
    open        NUMERIC(12,4) NOT NULL,
    high        NUMERIC(12,4) NOT NULL,
    low         NUMERIC(12,4) NOT NULL,
    close       NUMERIC(12,4) NOT NULL,
    volume      BIGINT NOT NULL DEFAULT 0,
    amount      NUMERIC(20,2) NOT NULL DEFAULT 0,
    amplitude   NUMERIC(10,4) DEFAULT 0,
    change_pct  NUMERIC(10,4) DEFAULT 0,
    turnover    NUMERIC(10,4) DEFAULT 0,
    UNIQUE(code, trade_date)
);

-- 3. 分时数据表（仅存最新一个交易日）
CREATE TABLE IF NOT EXISTS timeshare (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
    trade_date  DATE NOT NULL,
    trade_time  TIME NOT NULL,
    price       NUMERIC(12,4) NOT NULL,
    avg_price   NUMERIC(12,4) DEFAULT 0,
    volume      BIGINT DEFAULT 0,
    amount      NUMERIC(20,2) DEFAULT 0,
    UNIQUE(code, trade_date, trade_time)
);

-- 4. 股票概念/题材表
CREATE TABLE IF NOT EXISTS stock_concepts (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
    concept     VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(code, concept)
);

-- 5. 涨停原因表
CREATE TABLE IF NOT EXISTS limit_up_reasons (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
    trade_date  DATE NOT NULL,
    reason_type VARCHAR(200),
    reason_info TEXT,
    high_days   VARCHAR(20),
    limit_type  VARCHAR(20),
    category    VARCHAR(100),
    analysis    TEXT,
    UNIQUE(code, trade_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_kline_code_date ON kline_daily(code, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_kline_date ON kline_daily(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeshare_code_date ON timeshare(code, trade_date);
CREATE INDEX IF NOT EXISTS idx_concepts_code ON stock_concepts(code);
CREATE INDEX IF NOT EXISTS idx_concepts_name ON stock_concepts(concept);
CREATE INDEX IF NOT EXISTS idx_reasons_code_date ON limit_up_reasons(code, trade_date DESC);
