--
-- PostgreSQL database dump
--

\restrict UXwmzyHmNex2tNMOsC5XhcTgEutA1p1aJ2JuRXEwoDb3e7qeMiyFsg1L5lrpOmI

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: base_concepts_concept_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.base_concepts_concept_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: base_concepts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_concepts (
    concept_id integer DEFAULT nextval('public.base_concepts_concept_id_seq'::regclass) NOT NULL,
    concept_name character varying(100) NOT NULL,
    category character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: base_stock_concepts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_stock_concepts (
    code character varying(10) NOT NULL,
    concept_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: base_stocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.base_stocks (
    code character varying(10) NOT NULL,
    name character varying(50) NOT NULL,
    market character(2) DEFAULT 'SH'::bpchar NOT NULL,
    industry character varying(50),
    list_date date,
    is_st boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_dragon_tiger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_dragon_tiger (
    id bigint NOT NULL,
    code character varying(10) NOT NULL,
    trade_date date NOT NULL,
    reason character varying(200),
    buy_inst numeric(20,2) DEFAULT 0,
    sell_inst numeric(20,2) DEFAULT 0,
    buy_fund numeric(20,2) DEFAULT 0,
    sell_fund numeric(20,2) DEFAULT 0,
    buy_retail numeric(20,2) DEFAULT 0,
    sell_retail numeric(20,2) DEFAULT 0,
    top_branches text,
    change_pct numeric(10,4)
);


--
-- Name: daily_dragon_tiger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_dragon_tiger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_dragon_tiger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_dragon_tiger_id_seq OWNED BY public.daily_dragon_tiger.id;


--
-- Name: daily_kline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_kline (
    id bigint NOT NULL,
    code character varying(10) NOT NULL,
    trade_date date NOT NULL,
    open numeric(12,4) NOT NULL,
    high numeric(12,4) NOT NULL,
    low numeric(12,4) NOT NULL,
    close numeric(12,4) NOT NULL,
    volume bigint DEFAULT 0 NOT NULL,
    amount numeric(20,2) DEFAULT 0 NOT NULL,
    change_pct numeric(10,4) DEFAULT 0,
    turnover numeric(10,4) DEFAULT 0
);


--
-- Name: daily_kline_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_kline_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_kline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_kline_id_seq OWNED BY public.daily_kline.id;


--
-- Name: daily_limit_down; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_limit_down (
    id bigint NOT NULL,
    code character varying(10) NOT NULL,
    trade_date date NOT NULL,
    change_pct numeric(10,4),
    first_down_time time without time zone,
    seal_amount numeric(20,2),
    turnover_rate numeric(10,4),
    amount numeric(20,2)
);


--
-- Name: daily_limit_down_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_limit_down_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_limit_down_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_limit_down_id_seq OWNED BY public.daily_limit_down.id;


--
-- Name: daily_limit_up; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_limit_up (
    id bigint NOT NULL,
    code character varying(10) NOT NULL,
    trade_date date NOT NULL,
    continue_num integer DEFAULT 1 NOT NULL,
    first_limit_time time without time zone,
    last_limit_time time without time zone,
    seal_amount numeric(20,2),
    open_count integer DEFAULT 0,
    limit_type character varying(20),
    turnover_rate numeric(10,4),
    amount numeric(20,2),
    change_pct numeric(10,4),
    reason_type character varying(200),
    reason_info text,
    category character varying(100),
    analysis text
);


--
-- Name: daily_limit_up_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_limit_up_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_limit_up_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_limit_up_id_seq OWNED BY public.daily_limit_up.id;


--
-- Name: daily_sector; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_sector (
    id bigint NOT NULL,
    sector_code character varying(20) NOT NULL,
    trade_date date NOT NULL,
    sector_name character varying(100) NOT NULL,
    change_pct numeric(10,4) DEFAULT 0,
    limit_up_cnt integer DEFAULT 0,
    main_inflow numeric(20,2) DEFAULT 0,
    turnover numeric(10,4) DEFAULT 0,
    up_cnt integer DEFAULT 0,
    down_cnt integer DEFAULT 0,
    lead_code character varying(10),
    lead_name character varying(50),
    lead_pct numeric(10,4)
);


--
-- Name: daily_sector_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.daily_sector_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: daily_sector_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.daily_sector_id_seq OWNED BY public.daily_sector.id;


--
-- Name: realtime_timeshare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.realtime_timeshare (
    id bigint NOT NULL,
    code character varying(10) NOT NULL,
    trade_date date NOT NULL,
    trade_time time without time zone NOT NULL,
    price numeric(12,4) NOT NULL,
    avg_price numeric(12,4) DEFAULT 0,
    volume bigint DEFAULT 0,
    amount numeric(20,2) DEFAULT 0
);


--
-- Name: realtime_timeshare_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.realtime_timeshare_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: realtime_timeshare_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.realtime_timeshare_id_seq OWNED BY public.realtime_timeshare.id;


--
-- Name: stats_board_ladder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_board_ladder (
    trade_date date NOT NULL,
    board_level integer NOT NULL,
    stock_cnt integer DEFAULT 0,
    stocks_json jsonb,
    promo_in numeric(10,4) DEFAULT 0
);


--
-- Name: stats_market_sentiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_market_sentiment (
    trade_date date NOT NULL,
    limit_up_cnt integer DEFAULT 0,
    touch_cnt integer DEFAULT 0,
    broken_cnt integer DEFAULT 0,
    seal_rate numeric(10,4) DEFAULT 0,
    limit_down_cnt integer DEFAULT 0,
    big_loss_cnt integer DEFAULT 0,
    nuclear_cnt integer DEFAULT 0,
    promo_1to2 numeric(10,4) DEFAULT 0,
    promo_2to3 numeric(10,4) DEFAULT 0,
    promo_hi numeric(10,4) DEFAULT 0,
    yest_avg_pct numeric(10,4) DEFAULT 0,
    max_board integer DEFAULT 0,
    stage character varying(20) DEFAULT ''::character varying,
    sh_index numeric(10,4),
    sh_change numeric(10,4),
    sz_index numeric(10,4),
    total_amount numeric(20,2),
    up_cnt integer DEFAULT 0,
    down_cnt integer DEFAULT 0,
    main_inflow numeric(20,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stats_sector_strength; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stats_sector_strength (
    trade_date date NOT NULL,
    sector_code character varying(20) NOT NULL,
    sector_name character varying(100),
    change_pct numeric(10,4),
    change_5d numeric(10,4),
    change_60d numeric(10,4),
    limit_up_cnt integer DEFAULT 0,
    main_inflow numeric(20,2),
    dragon_code character varying(10),
    dragon_name character varying(50),
    strength character varying(10) DEFAULT '?'::character varying,
    quadrant character varying(10),
    rank integer,
    stock_cnt integer DEFAULT 0
);


--
-- Name: daily_dragon_tiger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_dragon_tiger ALTER COLUMN id SET DEFAULT nextval('public.daily_dragon_tiger_id_seq'::regclass);


--
-- Name: daily_kline id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_kline ALTER COLUMN id SET DEFAULT nextval('public.daily_kline_id_seq'::regclass);


--
-- Name: daily_limit_down id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_down ALTER COLUMN id SET DEFAULT nextval('public.daily_limit_down_id_seq'::regclass);


--
-- Name: daily_limit_up id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_up ALTER COLUMN id SET DEFAULT nextval('public.daily_limit_up_id_seq'::regclass);


--
-- Name: daily_sector id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sector ALTER COLUMN id SET DEFAULT nextval('public.daily_sector_id_seq'::regclass);


--
-- Name: realtime_timeshare id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_timeshare ALTER COLUMN id SET DEFAULT nextval('public.realtime_timeshare_id_seq'::regclass);


--
-- Name: base_concepts base_concepts_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_concepts
    ADD CONSTRAINT base_concepts_name_key UNIQUE (concept_name);


--
-- Name: base_concepts base_concepts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_concepts
    ADD CONSTRAINT base_concepts_pkey PRIMARY KEY (concept_id);


--
-- Name: base_stock_concepts base_stock_concepts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_stock_concepts
    ADD CONSTRAINT base_stock_concepts_pkey PRIMARY KEY (code, concept_id);


--
-- Name: base_stocks base_stocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_stocks
    ADD CONSTRAINT base_stocks_pkey PRIMARY KEY (code);


--
-- Name: daily_dragon_tiger daily_dragon_tiger_code_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_dragon_tiger
    ADD CONSTRAINT daily_dragon_tiger_code_trade_date_key UNIQUE (code, trade_date);


--
-- Name: daily_dragon_tiger daily_dragon_tiger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_dragon_tiger
    ADD CONSTRAINT daily_dragon_tiger_pkey PRIMARY KEY (id);


--
-- Name: daily_kline daily_kline_code_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_kline
    ADD CONSTRAINT daily_kline_code_trade_date_key UNIQUE (code, trade_date);


--
-- Name: daily_kline daily_kline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_kline
    ADD CONSTRAINT daily_kline_pkey PRIMARY KEY (id);


--
-- Name: daily_limit_down daily_limit_down_code_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_down
    ADD CONSTRAINT daily_limit_down_code_trade_date_key UNIQUE (code, trade_date);


--
-- Name: daily_limit_down daily_limit_down_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_down
    ADD CONSTRAINT daily_limit_down_pkey PRIMARY KEY (id);


--
-- Name: daily_limit_up daily_limit_up_code_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_up
    ADD CONSTRAINT daily_limit_up_code_trade_date_key UNIQUE (code, trade_date);


--
-- Name: daily_limit_up daily_limit_up_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_up
    ADD CONSTRAINT daily_limit_up_pkey PRIMARY KEY (id);


--
-- Name: daily_sector daily_sector_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sector
    ADD CONSTRAINT daily_sector_pkey PRIMARY KEY (id);


--
-- Name: daily_sector daily_sector_sector_code_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_sector
    ADD CONSTRAINT daily_sector_sector_code_trade_date_key UNIQUE (sector_code, trade_date);


--
-- Name: realtime_timeshare realtime_timeshare_code_trade_date_trade_time_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_timeshare
    ADD CONSTRAINT realtime_timeshare_code_trade_date_trade_time_key UNIQUE (code, trade_date, trade_time);


--
-- Name: realtime_timeshare realtime_timeshare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_timeshare
    ADD CONSTRAINT realtime_timeshare_pkey PRIMARY KEY (id);


--
-- Name: stats_board_ladder stats_board_ladder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_board_ladder
    ADD CONSTRAINT stats_board_ladder_pkey PRIMARY KEY (trade_date, board_level);


--
-- Name: stats_market_sentiment stats_market_sentiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_market_sentiment
    ADD CONSTRAINT stats_market_sentiment_pkey PRIMARY KEY (trade_date);


--
-- Name: stats_sector_strength stats_sector_strength_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stats_sector_strength
    ADD CONSTRAINT stats_sector_strength_pkey PRIMARY KEY (trade_date, sector_code);


--
-- Name: idx_bconcepts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bconcepts_category ON public.base_concepts USING btree (category);


--
-- Name: idx_bconcepts_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bconcepts_name ON public.base_concepts USING btree (concept_name);


--
-- Name: idx_bsconcepts_cid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsconcepts_cid ON public.base_stock_concepts USING btree (concept_id);


--
-- Name: idx_bsconcepts_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bsconcepts_code ON public.base_stock_concepts USING btree (code);


--
-- Name: idx_ddt_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ddt_d ON public.daily_dragon_tiger USING btree (trade_date DESC);


--
-- Name: idx_dkline_cd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dkline_cd ON public.daily_kline USING btree (code, trade_date DESC);


--
-- Name: idx_dkline_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dkline_d ON public.daily_kline USING btree (trade_date DESC);


--
-- Name: idx_dld_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dld_d ON public.daily_limit_down USING btree (trade_date DESC);


--
-- Name: idx_dlu_cd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dlu_cd ON public.daily_limit_up USING btree (code, trade_date DESC);


--
-- Name: idx_dlu_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dlu_d ON public.daily_limit_up USING btree (trade_date DESC);


--
-- Name: idx_dlu_lv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dlu_lv ON public.daily_limit_up USING btree (trade_date, continue_num DESC);


--
-- Name: idx_ds_d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ds_d ON public.daily_sector USING btree (trade_date DESC);


--
-- Name: idx_ds_p; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ds_p ON public.daily_sector USING btree (trade_date, change_pct DESC);


--
-- Name: idx_rt_cd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_cd ON public.realtime_timeshare USING btree (code, trade_date);


--
-- Name: idx_sss_q; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sss_q ON public.stats_sector_strength USING btree (trade_date, quadrant);


--
-- Name: idx_sss_r; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sss_r ON public.stats_sector_strength USING btree (trade_date, rank);


--
-- Name: base_stock_concepts base_stock_concepts_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_stock_concepts
    ADD CONSTRAINT base_stock_concepts_code_fkey FOREIGN KEY (code) REFERENCES public.base_stocks(code) ON DELETE CASCADE;


--
-- Name: base_stock_concepts base_stock_concepts_concept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.base_stock_concepts
    ADD CONSTRAINT base_stock_concepts_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.base_concepts(concept_id) ON DELETE CASCADE;


--
-- Name: daily_dragon_tiger daily_dragon_tiger_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_dragon_tiger
    ADD CONSTRAINT daily_dragon_tiger_code_fkey FOREIGN KEY (code) REFERENCES public.base_stocks(code) ON DELETE CASCADE;


--
-- Name: daily_kline daily_kline_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_kline
    ADD CONSTRAINT daily_kline_code_fkey FOREIGN KEY (code) REFERENCES public.base_stocks(code) ON DELETE CASCADE;


--
-- Name: daily_limit_down daily_limit_down_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_down
    ADD CONSTRAINT daily_limit_down_code_fkey FOREIGN KEY (code) REFERENCES public.base_stocks(code) ON DELETE CASCADE;


--
-- Name: daily_limit_up daily_limit_up_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_limit_up
    ADD CONSTRAINT daily_limit_up_code_fkey FOREIGN KEY (code) REFERENCES public.base_stocks(code) ON DELETE CASCADE;


--
-- Name: realtime_timeshare realtime_timeshare_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.realtime_timeshare
    ADD CONSTRAINT realtime_timeshare_code_fkey FOREIGN KEY (code) REFERENCES public.base_stocks(code) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict UXwmzyHmNex2tNMOsC5XhcTgEutA1p1aJ2JuRXEwoDb3e7qeMiyFsg1L5lrpOmI

