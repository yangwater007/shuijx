-- ============================================================
-- Stock Platform — 数据库 4 层重构
-- 旧5表 → 新12表 完整迁移脚本
-- 执行: docker exec -i quicktiny-pg psql -U quicktiny -d quicktiny < migrate.sql
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
--  第1层: base_ — 基础静态 (3张)
-- ════════════════════════════════════════════════════════════

-- 1.1 股票基础信息 (stocks → base_stocks)
CREATE TABLE base_stocks (
    code        VARCHAR(10) PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    market      CHAR(2) NOT NULL DEFAULT 'SH',
    industry    VARCHAR(50),
    list_date   DATE,                  -- 新增: 上市日期
    is_st       BOOLEAN DEFAULT FALSE, -- 新增: ST标志
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO base_stocks (code, name, market, industry)
SELECT code, name, market, industry FROM stocks;

-- 1.2 概念字典 (新建)
CREATE TABLE base_concepts (
    concept_id   INT PRIMARY KEY,
    concept_name VARCHAR(100) NOT NULL,
    category     VARCHAR(50),         -- 科技/消费/周期/金融/制造
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bconcepts_category ON base_concepts(category);
CREATE INDEX idx_bconcepts_name ON base_concepts(concept_name);

-- 预导入常见概念 (从同花顺/东财板块列表)
INSERT INTO base_concepts (concept_id, concept_name, category) VALUES
(1001, '芯片', '科技'), (1002, '半导体', '科技'), (1003, '光刻机', '科技'),
(1004, '人工智能', '科技'), (1005, '算力', '科技'), (1006, '信创', '科技'),
(1007, '通信', '科技'), (1008, '消费电子', '科技'), (1009, '机器人', '科技'),
(1010, '无人机', '科技'), (1011, '卫星导航', '科技'), (1012, '光通信', '科技'),
(2001, '新能源', '制造'), (2002, '锂电池', '制造'), (2003, '光伏', '制造'),
(2004, '储能', '制造'), (2005, '风电', '制造'), (2006, '氢能源', '制造'),
(2007, '核电', '制造'), (2008, '可控核聚变', '制造'), (2009, '商业航天', '制造'),
(2010, '低空经济', '制造'), (2011, '汽车零部件', '制造'),
(3001, '医药', '消费'), (3002, '医疗器械', '消费'), (3003, '创新药', '消费'),
(3004, '中药', '消费'), (3005, '医美', '消费'),
(4001, '大消费', '消费'), (4002, '食品饮料', '消费'), (4003, '白酒', '消费'),
(4004, '家电', '消费'), (4005, '旅游', '消费'),
(5001, '军工', '制造'), (5002, '国企改革', '金融'), (5003, '中字头', '金融'),
(5004, '券商', '金融'), (5005, '银行', '金融'), (5006, '保险', '金融'),
(6001, '房地产', '周期'), (6002, '有色金属', '周期'), (6003, '钢铁', '周期'),
(6004, '煤炭', '周期'), (6005, '化工', '周期'), (6006, '石油', '周期'),
(7001, '游戏', '消费'), (7002, '传媒', '消费'), (7003, '教育', '消费'),
(7004, '体育', '消费'),
(8001, '数字经济', '科技'), (8002, '数据要素', '科技'), (8003, '网络安全', '科技'),
(8004, '数字货币', '金融'), (8005, '区块链', '金融'),
(9001, '跨境电商', '消费'), (9002, '物流', '周期'), (9003, '农业', '消费'),
(9004, '环保', '周期'), (9005, '电力', '周期'), (9006, '建筑', '周期')
ON CONFLICT DO NOTHING;

-- 1.3 股票-概念映射 (stock_concepts → base_stock_concepts)
CREATE TABLE base_stock_concepts (
    code        VARCHAR(10) NOT NULL REFERENCES base_stocks(code) ON DELETE CASCADE,
    concept_id  INT NOT NULL REFERENCES base_concepts(concept_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (code, concept_id)
);

CREATE INDEX idx_bsconcepts_code ON base_stock_concepts(code);
CREATE INDEX idx_bsconcepts_cid ON base_stock_concepts(concept_id);


-- ════════════════════════════════════════════════════════════
--  第2层: daily_ — 日更原始 (5张)
-- ════════════════════════════════════════════════════════════

-- 2.1 日线K线 (kline_daily → daily_kline)
CREATE TABLE daily_kline (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL REFERENCES base_stocks(code) ON DELETE CASCADE,
    trade_date  DATE NOT NULL,
    open        NUMERIC(12,4) NOT NULL,
    high        NUMERIC(12,4) NOT NULL,
    low         NUMERIC(12,4) NOT NULL,
    close       NUMERIC(12,4) NOT NULL,
    volume      BIGINT NOT NULL DEFAULT 0,
    amount      NUMERIC(20,2) NOT NULL DEFAULT 0,
    change_pct  NUMERIC(10,4) DEFAULT 0,   -- 涨跌幅%
    turnover    NUMERIC(10,4) DEFAULT 0,   -- 换手率%
    UNIQUE(code, trade_date)
);

INSERT INTO daily_kline (code, trade_date, open, high, low, close, volume, amount, change_pct, turnover)
SELECT code, trade_date, open, high, low, close, volume, amount, change_pct, turnover FROM kline_daily;

CREATE INDEX idx_dkline_cd ON daily_kline(code, trade_date DESC);
CREATE INDEX idx_dkline_d ON daily_kline(trade_date DESC);

-- 2.2 涨停明细 (合并 limit_up_reasons)
CREATE TABLE daily_limit_up (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(10) NOT NULL REFERENCES base_stocks(code) ON DELETE CASCADE,
    trade_date       DATE NOT NULL,
    continue_num     INT NOT NULL DEFAULT 1,     -- 连板数
    first_limit_time TIME,                       -- 首次涨停时间
    last_limit_time  TIME,                       -- 最后涨停时间
    seal_amount      NUMERIC(20,2),              -- 封单额(元)
    open_count       INT DEFAULT 0,              -- 开板次数
    limit_type       VARCHAR(20),                -- 一字/T字/换手/尾盘
    turnover_rate    NUMERIC(10,4),              -- 换手率%
    amount           NUMERIC(20,2),              -- 成交额
    change_pct       NUMERIC(10,4),              -- 涨跌幅%
    reason_type      VARCHAR(200),               -- 涨停原因类型 (来自旧limit_up_reasons)
    reason_info      TEXT,                       -- 涨停原因文字
    category         VARCHAR(100),               -- 九阳公社分类
    analysis         TEXT,                       -- 原因分析
    UNIQUE(code, trade_date)
);

-- 迁移旧 limit_up_reasons 数据
INSERT INTO daily_limit_up (code, trade_date, reason_type, reason_info, limit_type, category, analysis)
SELECT code, trade_date, reason_type, reason_info, limit_type, category, analysis FROM limit_up_reasons;

CREATE INDEX idx_dlu_d ON daily_limit_up(trade_date DESC);
CREATE INDEX idx_dlu_lv ON daily_limit_up(trade_date, continue_num DESC);
CREATE INDEX idx_dlu_cd ON daily_limit_up(code, trade_date DESC);

-- 2.3 板块行情 (新建)
CREATE TABLE daily_sector (
    id            BIGSERIAL PRIMARY KEY,
    sector_code   VARCHAR(20) NOT NULL,          -- 板块代码(BKxxxx)
    trade_date    DATE NOT NULL,
    sector_name   VARCHAR(100) NOT NULL,         -- 板块名称
    change_pct    NUMERIC(10,4) DEFAULT 0,       -- 涨跌幅%
    limit_up_cnt  INT DEFAULT 0,                 -- 板块内涨停数
    main_inflow   NUMERIC(20,2) DEFAULT 0,       -- 主力净流入(元)
    turnover      NUMERIC(10,4) DEFAULT 0,       -- 换手率%
    up_cnt        INT DEFAULT 0,                 -- 上涨家数
    down_cnt      INT DEFAULT 0,                 -- 下跌家数
    lead_code     VARCHAR(10),                   -- 领涨股代码
    lead_name     VARCHAR(50),                   -- 领涨股名称
    lead_pct      NUMERIC(10,4),                 -- 领涨股涨幅
    UNIQUE(sector_code, trade_date)
);

CREATE INDEX idx_ds_d ON daily_sector(trade_date DESC);
CREATE INDEX idx_ds_p ON daily_sector(trade_date, change_pct DESC);

-- 2.4 跌停池 (新建)
CREATE TABLE daily_limit_down (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(10) NOT NULL REFERENCES base_stocks(code) ON DELETE CASCADE,
    trade_date      DATE NOT NULL,
    change_pct      NUMERIC(10,4),               -- 跌幅%
    first_down_time TIME,                        -- 首次跌停时间
    seal_amount     NUMERIC(20,2),               -- 封单额
    turnover_rate   NUMERIC(10,4),               -- 换手率
    amount          NUMERIC(20,2),               -- 成交额
    UNIQUE(code, trade_date)
);

CREATE INDEX idx_dld_d ON daily_limit_down(trade_date DESC);

-- 2.5 龙虎榜 (新建)
CREATE TABLE daily_dragon_tiger (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(10) NOT NULL REFERENCES base_stocks(code) ON DELETE CASCADE,
    trade_date    DATE NOT NULL,
    reason        VARCHAR(200),                  -- 上榜原因
    buy_inst      NUMERIC(20,2) DEFAULT 0,       -- 机构买入额
    sell_inst     NUMERIC(20,2) DEFAULT 0,       -- 机构卖出额
    buy_fund      NUMERIC(20,2) DEFAULT 0,       -- 游资买入额
    sell_fund     NUMERIC(20,2) DEFAULT 0,       -- 游资卖出额
    buy_retail    NUMERIC(20,2) DEFAULT 0,       -- 散户买入额
    sell_retail   NUMERIC(20,2) DEFAULT 0,       -- 散户卖出额
    top_branches  TEXT,                          -- 前5买入席位(逗号分隔)
    change_pct    NUMERIC(10,4),                 -- 当日涨跌幅
    UNIQUE(code, trade_date)
);

CREATE INDEX idx_ddt_d ON daily_dragon_tiger(trade_date DESC);


-- ════════════════════════════════════════════════════════════
--  第3层: stats_ — 复盘统计 (3张, 从daily_计算生成)
-- ════════════════════════════════════════════════════════════

-- 3.1 情绪总览 (每日1条)
CREATE TABLE stats_market_sentiment (
    trade_date       DATE PRIMARY KEY,
    
    -- 涨停维度
    limit_up_cnt     INT DEFAULT 0,              -- 涨停数
    touch_cnt        INT DEFAULT 0,              -- 触板数(涨停+炸板)
    broken_cnt       INT DEFAULT 0,              -- 炸板数
    seal_rate        NUMERIC(10,4) DEFAULT 0,    -- 封板率%
    
    -- 跌停维度
    limit_down_cnt   INT DEFAULT 0,              -- 跌停数
    big_loss_cnt     INT DEFAULT 0,              -- 大面股(日内跌>10%)
    nuclear_cnt      INT DEFAULT 0,              -- 核按钮(昨涨停今跌停)
    
    -- 晋级维度
    promo_1to2       NUMERIC(10,4) DEFAULT 0,    -- 1进2晋级率%
    promo_2to3       NUMERIC(10,4) DEFAULT 0,    -- 2进3晋级率%
    promo_hi         NUMERIC(10,4) DEFAULT 0,    -- 高位晋级率%(≥3板)
    
    -- 溢价维度
    yest_avg_pct     NUMERIC(10,4) DEFAULT 0,    -- 昨涨停今日均涨幅%
    max_board        INT DEFAULT 0,              -- 最高连板
    stage            VARCHAR(20) DEFAULT '',     -- 情绪阶段

    -- 大盘维度
    sh_index         NUMERIC(10,4),              -- 上证指数
    sh_change        NUMERIC(10,4),              -- 上证涨跌幅
    sz_index         NUMERIC(10,4),              -- 深证成指
    total_amount     NUMERIC(20,2),              -- 两市成交额
    up_cnt           INT DEFAULT 0,              -- 上涨家数
    down_cnt         INT DEFAULT 0,              -- 下跌家数
    main_inflow      NUMERIC(20,2),              -- 主力净流入
    
    created_at       TIMESTAMPTZ DEFAULT now()
);

-- 3.2 连板天梯统计 (每天每个高度1条)
CREATE TABLE stats_board_ladder (
    trade_date   DATE NOT NULL,
    board_level  INT NOT NULL,                   -- 连板高度
    stock_cnt    INT DEFAULT 0,                  -- 该高度股票数
    stocks_json  JSONB,                          -- [{code,name,theme,turnover,limit_type}]
    promo_in     NUMERIC(10,4) DEFAULT 0,        -- 从下级晋级率%
    PRIMARY KEY (trade_date, board_level)
);

-- 3.3 板块强度排行 (每天每个板块1条)
CREATE TABLE stats_sector_strength (
    trade_date    DATE NOT NULL,
    sector_code   VARCHAR(20) NOT NULL,
    sector_name   VARCHAR(100),
    change_pct    NUMERIC(10,4),                 -- 板块涨幅
    change_5d     NUMERIC(10,4),                 -- 近5日涨幅
    change_60d    NUMERIC(10,4),                 -- 近60日涨幅
    limit_up_cnt  INT DEFAULT 0,                 -- 涨停家数
    main_inflow   NUMERIC(20,2),                 -- 主力净流入
    dragon_code   VARCHAR(10),                   -- 龙头股代码
    dragon_name   VARCHAR(50),                   -- 龙头股名称
    strength      VARCHAR(10) DEFAULT '弱',      -- 强度评级(强/中/弱)
    quadrant      VARCHAR(10),                   -- 象限(高强/低强/高弱/低弱)
    rank          INT,                           -- 当日排名
    stock_cnt     INT DEFAULT 0,                 -- 成分股数量
    PRIMARY KEY (trade_date, sector_code)
);

CREATE INDEX idx_sss_q ON stats_sector_strength(trade_date, quadrant);
CREATE INDEX idx_sss_r ON stats_sector_strength(trade_date, rank);


-- ════════════════════════════════════════════════════════════
--  第4层: realtime_ — 实时高频 (1张)
-- ════════════════════════════════════════════════════════════

-- 4.1 分时行情 (timeshare → realtime_timeshare)
CREATE TABLE realtime_timeshare (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(10) NOT NULL REFERENCES base_stocks(code) ON DELETE CASCADE,
    trade_date  DATE NOT NULL,
    trade_time  TIME NOT NULL,
    price       NUMERIC(12,4) NOT NULL,
    avg_price   NUMERIC(12,4) DEFAULT 0,        -- 均价线
    volume      BIGINT DEFAULT 0,               -- 累计成交量
    amount      NUMERIC(20,2) DEFAULT 0,        -- 累计成交额
    UNIQUE(code, trade_date, trade_time)
);

CREATE INDEX idx_rt_cd ON realtime_timeshare(code, trade_date);

COMMIT;

-- ════════════════════════════════════════════════════════════
--  安全删除旧表 (手动执行, 确认新表OK后再跑)
-- ════════════════════════════════════════════════════════════
-- DROP TABLE IF EXISTS timeshare, stock_concepts, limit_up_reasons, kline_daily, stocks CASCADE;

-- ════════════════════════════════════════════════════════════
--  验证
-- ════════════════════════════════════════════════════════════
-- SELECT 'base_stocks', count(*) FROM base_stocks
-- UNION ALL SELECT 'base_concepts', count(*) FROM base_concepts
-- UNION ALL SELECT 'base_stock_concepts', count(*) FROM base_stock_concepts
-- UNION ALL SELECT 'daily_kline', count(*) FROM daily_kline
-- UNION ALL SELECT 'daily_limit_up', count(*) FROM daily_limit_up
-- UNION ALL SELECT 'daily_sector', count(*) FROM daily_sector
-- UNION ALL SELECT 'daily_limit_down', count(*) FROM daily_limit_down
-- UNION ALL SELECT 'daily_dragon_tiger', count(*) FROM daily_dragon_tiger
-- UNION ALL SELECT 'stats_market_sentiment', count(*) FROM stats_market_sentiment
-- UNION ALL SELECT 'stats_board_ladder', count(*) FROM stats_board_ladder
-- UNION ALL SELECT 'stats_sector_strength', count(*) FROM stats_sector_strength
-- UNION ALL SELECT 'realtime_timeshare', count(*) FROM realtime_timeshare;
