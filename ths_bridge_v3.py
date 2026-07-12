# -*- coding: utf-8 -*-
"""
ths_bridge_v3.py — A股全数据桥 HTTP 服务 (扩展版)
================================================
覆盖六大类数据，三级回退(mootdx→同花顺→腾讯)，无会员依赖。

端点总览:
  行情: /kline  /minute  /quote  /batch_kline
  市场: /market/overview  /market/index
  板块: /sector/ranking  /sector/stocks
  概念: /concept/ranking  /concept/stocks
  涨停: /limit/up  /limit/stats  /limit/broken
  资金: /fund/flow  /fund/sector
  财务: /finance/valuation
  龙虎: /dragon/list
  缓存: /cache/stats  /cache/clear
  健康: /health

启动: python ths_bridge_v3.py  (端口 8765)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import time, threading, requests, json, logging, re
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format="[BRIDGE] %(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("bridge")

# ─── mootdx ───────────────────────────────
try:
    from mootdx.quotes import Quotes
    _dx = Quotes.factory(market="std", timeout=8)
    HAS_MOOTDX = True
    log.info("mootdx 已连接")
except Exception as e:
    _dx = None; HAS_MOOTDX = False
    log.warning(f"mootdx 不可用: {e}")
# ─── PostgreSQL ────────────────────────────
try:
    import psycopg2, psycopg2.pool, psycopg2.extras
    _pg_pool = psycopg2.pool.ThreadedConnectionPool(
        2, 5,
        host="localhost", port=5432,
        dbname="quicktiny", user="quicktiny", password="quicktiny123",
    )
    HAS_PG = True
    log.info("PostgreSQL 已连接")
    def _pg_exec(sql, params=None):
        conn = _pg_pool.getconn()
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql, params)
                if sql.strip().upper().startswith("SELECT"):
                    return cur.fetchall()
                conn.commit()
                return cur.rowcount
        finally:
            _pg_pool.putconn(conn)
except Exception as e:
    _pg_pool = None; HAS_PG = False
    log.warning(f"PostgreSQL 不可用: {e}")
    def _pg_exec(sql, params=None): return None
def _last_trade_date():
    """Get most recent trading day from daily_kline"""
    try:
        rows = _pg_exec("SELECT max(trade_date) as d FROM daily_kline")
        if rows and rows[0]["d"]:
            d = rows[0]["d"]
            return d.isoformat() if hasattr(d, "isoformat") else str(d)
    except: pass
    return None

def _db_ranking(metric="change_pct", direction="DESC", limit=20):
    """Generic DB ranking query"""
    dt = _last_trade_date()
    if not dt: return []
    safe_metric = "change_pct" if metric not in ("change_pct","amount","volume") else metric
    try:
        rows = _pg_exec(
            f"SELECT code, change_pct, amount, volume FROM daily_kline WHERE trade_date=%s ORDER BY {safe_metric} {direction} LIMIT %s",
            (dt, limit)
        )
        if rows:
            return [{"code": r["code"], "changePercent": float(r["change_pct"] or 0), "amount": float(r["amount"] or 0), "volume": int(r["volume"] or 0)} for r in rows]
    except: pass
    return []

def _db_sector_ranking():
    """Sector ranking - own connection for reliability"""
    if not HAS_PG: return []
    dt = _last_trade_date()
    if not dt: return []
    try:
        import psycopg2, psycopg2.extras
        conn = psycopg2.connect(host="localhost", port=5432, dbname="quicktiny", user="quicktiny", password="quicktiny123")
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            WITH sector_perf AS (
                SELECT COALESCE(bc.concept_name, '其他') as name,
                       round(avg(dk.change_pct)::numeric, 2) as change_pct,
                       count(*) as stock_cnt
                FROM daily_kline dk
                LEFT JOIN base_stock_concepts bsc ON dk.code = bsc.code
                LEFT JOIN base_concepts bc ON bsc.concept_id = bc.concept_id
                WHERE dk.trade_date = %s
                GROUP BY bc.concept_name
            )
            SELECT * FROM sector_perf WHERE name IS NOT NULL ORDER BY change_pct DESC LIMIT 30
        """, (dt,))
        rows = cur.fetchall()
        cur.close(); conn.close()
        if rows:
            result = [{"name": r["name"], "changePercent": float(r["change_pct"]), "stockCnt": int(r["stock_cnt"])} for r in rows]
            log.info(f"DB sector ranking: {len(result)} sectors")
            return result
    except Exception as e:
        log.warning(f"DB sector ranking failed: {e}")
    return []

def _db_market_overview():
    """Market overview from daily_kline"""
    dt = _last_trade_date()
    if not dt: return None
    try:
        rows = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct>0) as up, count(*) FILTER (WHERE change_pct<0) as down, count(*) FILTER (WHERE change_pct=0) as flat FROM daily_kline WHERE trade_date=%s",
            (dt,)
        )
        if rows and rows[0]:
            r = rows[0]
            return {"up": r["up"] or 0, "down": r["down"] or 0, "flat": r["flat"] or 0, "total": (r["up"] or 0) + (r["down"] or 0) + (r["flat"] or 0), "date": dt, "source": "database"}
    except: pass
    return None

# ─── Flask ────────────────────────────────
app = Flask(__name__)
CORS(app)
PORT = 8765

# ─── 缓存 ──────────────────────────────────
_cache: dict = {}
def _get(key): 
    e = _cache.get(key)
    if e and time.time() < e[0]: return e[1]
    _cache.pop(key, None); return None
def _set(key, data, ttl): _cache[key] = (time.time() + ttl, data)

CACHE = dict(KLINE=300, MINUTE=30, QUOTE=10, SECTOR=120, CONCEPT=300, LIMIT=60, FUND=120, VALUATION=1800, DRAGON=600)

# ─── HTTP工具 ──────────────────────────────
_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})

def _http(url, timeout=8, encoding=None, referer=None):
    h = {"Referer": referer or "https://finance.qq.com/"}
    try:
        r = _SESSION.get(url, timeout=timeout, headers=h)
        if encoding: r.encoding = encoding
        r.raise_for_status()
        return r
    except Exception as e:
        log.warning(f"HTTP FAIL {url[:60]}: {e}")
        return None

# ─── 市场前缀 ──────────────────────────────
def _mkt_mootdx(c): return "1" if c[0]=="6" else ("0" if c[0] in "023" else "2")
def _mkt_ths(c): return "hs" if c[0]=="6" else ("sz" if c[0] in "023" else "bj")
def _mkt_tx(c): return "sh" if c[0]=="6" else ("sz" if c[0] in "023" else "bj")

# ═══════════════════════════════════════════
#  K线/分时/行情 (保留v2功能)
# ═══════════════════════════════════════════

def _parse_ths_kl(text):
    r = []
    for line in text.split(";"):
        if not line.strip(): continue
        p = line.split(",")
        if len(p) < 6: continue
        try: r.append({"date":p[0],"open":float(p[1]),"high":float(p[2]),"low":float(p[3]),"close":float(p[4]),"volume":int(float(p[5])),"amount":float(p[6]) if len(p)>6 else 0})
        except: pass
    return r

def _parse_ths_min(text):
    r = []
    for line in text.split(";"):
        if not line.strip(): continue
        p = line.split(",")
        if len(p) < 3: continue
        try: r.append({"time":p[0],"price":float(p[1]),"volume":int(float(p[2]))})
        except: pass
    return r

def _fetch_kline_source(code, count):
    """三级回退获取K线，返回(data, source)"""
    # mootdx
    if HAS_MOOTDX:
        try:
            mkt = int(_mkt_mootdx(code))
            d = _dx.bars(symbol=code, frequency=9, start=0, offset=count)
            if d is not None and len(d):
                return ([{"date":str(r.get("date","")),"open":float(r.get("open",0)),"high":float(r.get("high",0)),"low":float(r.get("low",0)),"close":float(r.get("close",0)),"volume":int(r.get("volume",0)),"amount":float(r.get("amount",0))} for r in d], "mootdx")
        except: pass
    # 同花顺
    try:
        mkt = _mkt_ths(code)
        r = _http(f"https://d.10jqka.com.cn/v2/line/{mkt}_{code}/01/last.js", referer="https://www.10jqka.com.cn/")
        if r:
            s = r.text.find("{"); e = r.text.rfind("}")
            if s>=0 and e>=0:
                obj = json.loads(r.text[s:e+1])
                raw = obj.get("data","")
                if raw:
                    all_d = _parse_ths_kl(raw)
                    return (all_d[-count:] if len(all_d)>count else all_d, "ths")
    except: pass
    # 腾讯
    try:
        mkt = _mkt_tx(code)
        r = _http(f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={mkt}{code},day,,,{count},qfq")
        if r:
            sd = r.json().get("data",{}).get(f"{mkt}{code}",{})
            kl = sd.get("qfqday") or sd.get("day") or []
            return ([{"date":row[0],"open":float(row[1]),"close":float(row[2]),"high":float(row[3]),"low":float(row[4]),"volume":int(float(row[5]))} for row in kl if len(row)>=6], "tencent")
    except: pass
    return ([], "none")

def _fetch_minute_source(code):
    if HAS_MOOTDX:
        try:
            d = _dx.minutes(symbol=code)
            if d is not None and len(d):
                return ([{"time":str(r.get("time","")),"price":float(r.get("price",0)),"volume":int(r.get("volume",0))} for r in d], "mootdx")
        except: pass
    try:
        mkt = _mkt_ths(code)
        r = _http(f"https://d.10jqka.com.cn/v2/time/{mkt}_{code}/last.js", referer="https://www.10jqka.com.cn/")
        if r:
            s = r.text.find("{"); e = r.text.rfind("}")
            if s>=0 and e>=0:
                obj = json.loads(r.text[s:e+1])
                raw = obj.get("data","")
                if raw: return (_parse_ths_min(raw), "ths")
    except: pass
    try:
        mkt = _mkt_tx(code)
        r = _http(f"https://ifzq.gtimg.cn/appstock/app/minute/query?code={mkt}{code}")
        if r:
            sd = r.json().get("data",{}).get(f"{mkt}{code}",{}).get("data",{})
            raw = sd.get("data",[])
            return ([{"time":p[0],"price":float(p[1]),"volume":int(float(p[2]))} for p in (x.split(" ") for x in raw) if len(p)>=3], "tencent")
    except: pass
    return ([], "none")

def _fetch_quote_source(codes):
    if HAS_MOOTDX:
        try:
            d = _dx.quotes(symbols=codes)
            if d is not None and len(d):
                names = list(d[0].dtype.names)
                return ([{
                    "code": str(r[names.index("code")]) if "code" in names else "",
                    "name": str(r[names.index("name")]) if "name" in names else "",
                    "price": float(r[names.index("price")]) if "price" in names else 0,
                    "preClose": float(r[names.index("last_close")]) if "last_close" in names else (float(r[names.index("pre_close")]) if "pre_close" in names else 0),
                    "open": float(r[names.index("open")]) if "open" in names else 0,
                    "high": float(r[names.index("high")]) if "high" in names else 0,
                    "low": float(r[names.index("low")]) if "low" in names else 0,
                    "volume": int(r[names.index("volume")]) if "volume" in names else 0,
                    "amount": float(r[names.index("amount")]) if "amount" in names else 0,
                } for r in d], "mootdx")
        except: pass
    try:
        tc = [f"{_mkt_tx(c)}{c}" for c in codes]
        r = _http(f"https://qt.gtimg.cn/q={','.join(tc)}")
        if r:
            r.encoding = "gbk"
            result = []
            for line in r.text.strip().split("\n"):
                if '="' not in line: continue
                inner = line.split('="',1)[1].rstrip('";\n')
                f = inner.split("~")
                if len(f) < 10: continue
                result.append({"code":f[2],"name":f[1],"price":float(f[3] or 0),"preClose":float(f[4] or 0),"open":float(f[5] or 0),"high":float(f[33] or 0) if len(f)>33 else 0,"low":float(f[34] or 0) if len(f)>34 else 0,"volume":int(float(f[6] or 0)),"amount":float(f[37] or 0) if len(f)>37 else 0})
            if result: return (result, "tencent")
    except: pass
    return ([], "none")

# ═══════════════════════════════════════════
#  市场总览 (涨跌家数 + 指数)
# ═══════════════════════════════════════════

def _market_overview():
    """从多个源拼接市场总览"""
    result = {"up": 0, "down": 0, "flat": 0, "total": 0, "indices": [], "timestamp": datetime.now().isoformat()}
    
    # 腾讯指数数据
    try:
        r = _http("https://qt.gtimg.cn/q=sh000001,sz399001,sz399006,sh000688", encoding="gbk")
        if r:
            for line in r.text.strip().split("\n"):
                if '="' not in line: continue
                inner = line.split('="',1)[1].rstrip('";\n')
                f = inner.split("~")
                if len(f) < 32: continue
                result["indices"].append({
                    "code": f[2], "name": f[1],
                    "price": float(f[3] or 0), "preClose": float(f[4] or 0),
                    "change": float(f[31] or 0), "changePercent": float(f[32] or 0),
                })
    except: pass
    
    # 上证涨跌家数字段: f169=上涨, f170=下跌, f171=平盘
    try:
        r = _http("https://push2.eastmoney.com/api/qt/stock/get?secid=1.000001&fields=f169,f170,f171", referer="https://quote.eastmoney.com/")
        if r:
            d = r.json().get("data",{})
            result["up"] = d.get("f169", 0) or 0
            result["down"] = d.get("f170", 0) or 0
            result["flat"] = d.get("f171", 0) or 0
            result["total"] = result["up"] + result["down"] + result["flat"]
    except: 
        # 东方财富不行，用腾讯近似
        pass
    
    return result

def _concept_ranking_mootdx():
    """从mootdx获取概念板块排序"""
    if not HAS_MOOTDX: return None
    try:
        blocks = _dx.block(blockname="概念", symbol="")
        if blocks is None or len(blocks) == 0: return None
        # 每个block有: blockname, block_type, code_index, code
        # 我们需要获取每个概念板块的行情
        result = []
        for b in blocks[:50]:  # 只取前50个
            code = str(b[3]) if len(b) > 3 else ""
            if not code: continue
            try:
                q = _dx.quotes(symbols=[code])
                if q is not None and len(q):
                    names = list(q[0].dtype.names)
                    result.append({
                        "code": code,
                        "name": str(b[0]) if len(b) > 0 else "",
                        "price": float(q[0][names.index("price")]) if "price" in names else 0,
                        "changePercent": float(q[0][names.index("pct_chg")]) if "pct_chg" in names else 0,
                    })
            except: pass
        result.sort(key=lambda x: x.get("changePercent", 0), reverse=True)
        return result[:20]
    except Exception as e:
        log.warning(f"mootdx 概念排行失败: {e}")
        return None

def _concept_ranking_ths():
    """从同花顺获取概念排行"""
    try:
        r = _http("https://d.10jqka.com.cn/v2/board/index/field/zdf/order/desc/page/1/ajax/1/free/1/", referer="https://www.10jqka.com.cn/")
        if r:
            obj = json.loads(r.text)
            data = obj.get("data", [])
            return [{"code": d.get("code",""), "name": d.get("name",""), "changePercent": d.get("zdf",0)} for d in data[:20]]
    except: pass
    return None

# ─── 东财 push2delay 公共 API ─────────────
# push2delay.eastmoney.com 相比 push2 限制少，非交易时间也可获取前日数据
EM_DELAY = "https://push2delay.eastmoney.com"

def _em_fund_clist(fs, fields, fid="f62", pz=30, sort=1):
    """通用东财资金流排行查询"""
    import requests as req
    try:
        url = f"{EM_DELAY}/api/qt/clist/get?pn=1&pz={pz}&po={sort}&np=1&fltt=2&invt=2&fid={fid}&fs={fs}&fields={fields}"
        r = req.get(url, timeout=8,
                    headers={"User-Agent": "Mozilla/5.0", "Referer": "https://wap.eastmoney.com/"})
        r.raise_for_status()
        return r.json().get("data", {}).get("diff", [])
    except Exception as e:
        log.warning(f"东财资金流查询失败({fs}): {e}")
        return []

def _em_fund_flow_market():
    """大盘主力资金流汇总（按行业板块求和）"""
    items = _em_fund_clist("m:90+t:2", "f12,f14,f3,f62,f64,f66,f68,f70,f184", "f62", 60)
    if not items:
        return None
    total_main = sum(d.get("f62") or 0 for d in items)
    total_super = sum(d.get("f64") or 0 for d in items)
    total_large = sum(d.get("f66") or 0 for d in items)
    total_medium = sum(d.get("f68") or 0 for d in items)
    total_small = sum(d.get("f70") or 0 for d in items)
    total_amount = 0
    # 从数据库获取总成交额
    dt = _last_trade_date()
    if dt and HAS_PG:
        rows = _pg_exec("SELECT sum(amount) as ta FROM daily_kline WHERE trade_date=%s", (dt,))
        if rows and rows[0]["ta"]:
            total_amount = float(rows[0]["ta"])
    return {
        "mainNetInflow": total_main, "superLargeNetInflow": total_super,
        "largeNetInflow": total_large, "mediumNetInflow": total_medium,
        "smallNetInflow": total_small, "totalAmount": total_amount,
        "source": "eastmoney_push2delay"
    }

def _sector_fund_flow_v2():
    """板块资金流（东财push2delay → DB fallback）"""
    items = _em_fund_clist("m:90+t:2", "f12,f14,f2,f3,f62,f184,f66,f64,f68,f70", "f62", 40)
    if items:
        return [{
            "code": d.get("f12",""), "name": d.get("f14",""),
            "changePercent": d.get("f3",0), "mainNetInflow": d.get("f62",0),
            "superLargeInflow": d.get("f64",0), "largeInflow": d.get("f66",0),
            "mediumInflow": d.get("f68",0), "smallInflow": d.get("f70",0),
            "maxInflow": d.get("f184",0),
        } for d in items]
    return _db_sector_ranking()

def _concept_fund_flow():
    """概念板块资金流（桑基图数据源）"""
    items = _em_fund_clist("m:90+t:3", "f12,f14,f3,f62,f184,f66", "f62", 50)
    if items:
        return [{
            "code": d.get("f12",""), "name": d.get("f14",""),
            "changePercent": d.get("f3",0), "mainNetInflow": d.get("f62",0),
            "maxInflow": d.get("f184",0), "largeInflow": d.get("f66",0),
        } for d in items]
    return []

def _stock_fund_flow(top_n=50):
    """个股资金流排行（沪深A股主力净流入Top N）"""
    fs_all = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23"
    items = _em_fund_clist(fs_all, "f12,f14,f2,f3,f62,f64,f66,f68,f70,f184,f72", "f62", top_n)
    if items:
        return [{
            "code": d.get("f12",""), "name": d.get("f14",""),
            "price": d.get("f2",0), "changePercent": d.get("f3",0),
            "mainNetInflow": d.get("f62",0), "superLargeInflow": d.get("f64",0),
            "largeInflow": d.get("f66",0), "mediumInflow": d.get("f68",0),
            "smallInflow": d.get("f70",0), "maxInflow": d.get("f184",0),
            "mainInflowRatio": d.get("f72",0),
        } for d in items]
    return []

def _sector_fund_flow():
    """从腾讯获取板块资金流向"""
    try:
        # 腾讯板块排行
        r = _http("https://qt.gtimg.cn/q=pt00500051,pt00500052,pt00500053", encoding="gbk")
        if r:
            result = []
            for line in r.text.strip().split("\n"):
                if '="' not in line: continue
                f = line.split('="',1)[1].rstrip('";\n').split("~")
                if len(f) < 4: continue
                result.append({"code": f[2] if len(f)>2 else "", "name": f[1] if len(f)>1 else "", "changePercent": float(f[3] or 0) if len(f)>3 else 0})
            return result
    except: pass
    
    # 东方财富板块资金
    try:
        r = _http("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&fs=m:90+t:2&fields=f12,f14,f2,f3,f62,f184&fid=f62", referer="https://data.eastmoney.com/")
        if r:
            diff = r.json().get("data",{}).get("diff",[])
            return [{"code": d.get("f12",""), "name": d.get("f14",""), "changePercent": d.get("f3",0),"mainNetInflow": d.get("f62",0)} for d in diff]
    except: pass
    return []

# ═══════════════════════════════════════════
#  路由
# ═══════════════════════════════════════════

@app.route("/health")
def health():
    return jsonify({"status":"ok","mootdx":HAS_MOOTDX,"timestamp":time.time()})

@app.route("/kline")
def kline():
    code = request.args.get("code","").strip()
    if len(code) != 6: return jsonify({"error":"无效代码"}), 400
    count = min(max(int(request.args.get("count",60)), 1), 365)
    
    # 1. 内存缓存
    ck = f"kl:{code}:{count}"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    # 2. PostgreSQL 缓存
    if HAS_PG:
        try:
            rows = _pg_exec(
                "SELECT trade_date as date, open, high, low, close, volume, amount FROM daily_kline WHERE code=%s ORDER BY trade_date DESC LIMIT %s",
                (code, count)
            )
            if rows and len(rows) >= min(count, 3):
                data = [dict(r) for r in reversed(rows)]
                # Convert Decimal to float
                for d in data:
                    for k in ("open","high","low","close","amount"):
                        if k in d and d[k] is not None: d[k] = float(d[k])
                    if "volume" in d and d["volume"] is not None: d["volume"] = int(d["volume"])
                    if "date" in d and hasattr(d["date"], "isoformat"): d["date"] = d["date"].isoformat()
                r = {"code":code,"count":count,"source":"postgres","data":data}
                _set(ck, r, CACHE["KLINE"])
                return jsonify(r)
        except Exception as e:
            log.warning(f"PG kline read failed: {e}")
    
    # 3. 在线抓取
    data, src = _fetch_kline_source(code, count)
    
    # 4. 写回 PostgreSQL
    if HAS_PG and data and len(data) > 0:
        try:
            _pg_exec(
                "INSERT INTO base_stocks (code, name, market) VALUES (%s,%s,%s) ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, updated_at=now()",
                (code, code, "SH" if code[0]=="6" else ("SZ" if code[0] in "023" else "BJ"))
            )
            for d in data[-20:]:  # 写最近20条
                _pg_exec(
                    "INSERT INTO daily_kline (code, trade_date, open, high, low, close, volume, amount) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (code, trade_date) DO NOTHING",
                    (code, d.get("date"), d.get("open"), d.get("high"), d.get("low"), d.get("close"), d.get("volume"), d.get("amount", 0))
                )
        except Exception as e:
            log.warning(f"PG kline write failed: {e}")
    
    r = {"code":code,"count":count,"source":src,"data":data}
    _set(ck, r, CACHE["KLINE"])
    return jsonify(r)

@app.route("/minute")
def minute():
    code = request.args.get("code","").strip()
    if len(code) != 6: return jsonify({"error":"无效代码"}), 400
    ck = f"min:{code}"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    # PostgreSQL
    if HAS_PG:
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            rows = _pg_exec(
                "SELECT trade_time as time, price, volume FROM realtime_timeshare WHERE code=%s AND trade_date=%s ORDER BY trade_time",
                (code, today)
            )
            if rows and len(rows) > 10:
                data = []
                for r in rows:
                    d = dict(r)
                    for k in ("price",): 
                        if k in d and d[k] is not None: d[k] = float(d[k])
                    if "volume" in d and d["volume"] is not None: d["volume"] = int(d["volume"])
                    if "time" in d and hasattr(d["time"], "isoformat"): d["time"] = d["time"].isoformat()
                    data.append(d)
                result = {"code":code,"source":"postgres","data":data}
                _set(ck, result, CACHE["MINUTE"])
                return jsonify(result)
        except Exception as e:
            log.warning(f"PG minute read failed: {e}")
    
    data, src = _fetch_minute_source(code)
    
    # 写回 PG
    if HAS_PG and data and len(data) > 0:
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            _pg_exec("DELETE FROM realtime_timeshare WHERE code=%s AND trade_date=%s", (code, today))
            for d in data:
                _pg_exec(
                    "INSERT INTO realtime_timeshare (code, trade_date, trade_time, price, volume) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    (code, today, d.get("time"), d.get("price"), d.get("volume", 0))
                )
        except Exception as e:
            log.warning(f"PG minute write failed: {e}")
    
    r = {"code":code,"source":src,"data":data}
    _set(ck, r, CACHE["MINUTE"])
    return jsonify(r)

@app.route("/quote")
def quote():
    codes_str = request.args.get("codes","").strip()
    if not codes_str: return jsonify({"error":"缺少代码"}), 400
    codes = [c.strip() for c in codes_str.split(",") if len(c.strip())==6]
    if not codes: return jsonify({"error":"无效代码"}), 400
    ck = f"qt:{','.join(sorted(codes))}"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data, src = _fetch_quote_source(codes)
    r = {"source":src,"data":data}
    _set(ck, r, CACHE["QUOTE"])
    return jsonify(r)

@app.route("/batch_kline")
def batch_kline():
    codes_str = request.args.get("codes","").strip()
    if not codes_str: return jsonify({"error":"缺少代码"}), 400
    codes = [c.strip() for c in codes_str.split(",") if len(c.strip())==6]
    count = min(max(int(request.args.get("count",60)), 1), 365)
    result = {}
    for code in codes:
        ck = f"kl:{code}:{count}"
        cached = _get(ck)
        if cached:
            result[code] = cached.get("data",[])
            continue
        data, _ = _fetch_kline_source(code, count)
        result[code] = data
        _set(ck, {"code":code,"count":count,"data":data}, CACHE["KLINE"])
    return jsonify({"data":result})

# ─── 市场总览 ─────────────────────────────

# DB fallback for market overview
def _market_overview_fallback():
    db_data = _db_market_overview()
    if db_data: return db_data
    return {"up":0,"down":0,"flat":0,"total":0,"indices":[],"timestamp":datetime.now().isoformat()}


@app.route("/market/overview")
def market_overview():
    ck = "market:overview"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _market_overview()
    if data.get("up",0) + data.get("down",0) == 0:
        db = _db_market_overview()
        if db: 
            data["up"] = db["up"]; data["down"] = db["down"]; data["flat"] = db["flat"]; data["total"] = db["total"]
    # DB fallback when indices/up-down are empty
    if not data.get("indices") and data.get("up",0) + data.get("down",0) == 0:
        db = _db_market_overview()
        if db: data["up"] = db["up"]; data["down"] = db["down"]; data["flat"] = db["flat"]; data["total"] = db["total"]; data["source"] = "database"
    _set(ck, data, CACHE["LIMIT"])
    return jsonify(data)

@app.route("/market/index")
def market_index():
    """获取主要指数: sh000001, sz399001, sz399006"""
    try:
        r = _http("https://qt.gtimg.cn/q=sh000001,sz399001,sz399006,sh000688", encoding="gbk")
        indices = []
        if r:
            for line in r.text.strip().split("\n"):
                if '="' not in line: continue
                f = line.split('="',1)[1].rstrip('";\n').split("~")
                if len(f) < 32: continue
                indices.append({"code":f[2],"name":f[1],"price":float(f[3] or 0),"preClose":float(f[4] or 0),"change":float(f[31] or 0),"changePercent":float(f[32] or 0),"high":float(f[33] or 0) if len(f)>33 else 0,"low":float(f[34] or 0) if len(f)>34 else 0,"volume":int(float(f[6] or 0)),"amount":float(f[37] or 0) if len(f)>37 else 0})
        return jsonify({"indices": indices, "source": "tencent"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── 板块/概念 ────────────────────────────

@app.route("/sector/ranking")
def sector_ranking():
    ck = "sector:ranking"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _sector_fund_flow_v2()
    if not data:
        data = _db_sector_ranking()
    if not data and HAS_MOOTDX:
        try:
            blocks = _dx.block(blockname="行业", symbol="")
            if blocks is not None and len(blocks):
                block_codes = [str(b[3]) for b in blocks[:30] if len(b) > 3]
                if block_codes:
                    quotes = _dx.quotes(symbols=block_codes[:20])
                    if quotes is not None and len(quotes):
                        names = list(quotes[0].dtype.names)
                        code_idx = names.index("code") if "code" in names else 0
                        name_idx = names.index("name") if "name" in names else 1
                        pct_idx = names.index("pct_chg") if "pct_chg" in names else -1
                        data = [{"code":str(q[code_idx]),"name":str(q[name_idx]),"changePercent":float(q[pct_idx]) if pct_idx>=0 else 0} for q in quotes]
                        data.sort(key=lambda x: x.get("changePercent",0), reverse=True)
        except: pass
    if not data:
        old = _get("sector:ranking:last_trading")
        if old: data = old
    if not data:
        data = []
    if data:
        _set(ck, data, CACHE["SECTOR"])
        _set("sector:ranking:last_trading", data, 86400)
    return jsonify({"data": data})

@app.route("/concept/ranking")
def concept_ranking():
    ck = "concept:ranking"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _concept_ranking_mootdx()
    if not data:
        data = _db_sector_ranking()
    if not data:
        old = _get("concept:ranking:last_trading")
        if old: data = old
    if not data:
        data = _concept_ranking_ths() or []
    if data:
        _set(ck, data, CACHE["CONCEPT"])
        _set("concept:ranking:last_trading", data, 86400)
    return jsonify({"data": data})

@app.route("/concept/stocks")
def concept_stocks():
    """获取概念板块成分股"""
    code = request.args.get("code","").strip()
    if not code: return jsonify({"error":"缺少板块代码"}), 400
    if HAS_MOOTDX:
        try:
            stocks = _dx.block(symbol=code)
            if stocks is not None and len(stocks):
                return jsonify({"code": code, "stocks": [str(s[3]) for s in stocks[:50]]})
        except: pass
    return jsonify({"code": code, "stocks": []})

# ─── 涨停生态 ─────────────────────────────

@app.route("/limit/stats")
def limit_stats():
    """涨跌停统计: 涨停数、炸板数、封板率等"""
    ck = "limit:stats"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    # DB fallback
    dt = _last_trade_date()
    if dt and HAS_PG:
        try:
            db_rows = _pg_exec("SELECT count(*) FILTER (WHERE change_pct >= 9.8) as up_cnt, count(*) FILTER (WHERE change_pct <= -9.8) as down_cnt FROM daily_kline WHERE trade_date=%s", (dt,))
            if db_rows:
                stats = {"up": db_rows[0]["up_cnt"] or 0, "down": db_rows[0]["down_cnt"] or 0, "broken": 0, "sealRate": 0, "date": dt, "source": "database"}
                _set(ck, stats, CACHE["LIMIT"])
                return jsonify(stats)
        except: pass
    
    stats = {"up": 0, "down": 0, "broken": 0, "sealRate": 0, "timestamp": datetime.now().isoformat(), "source": "unavailable"}
    
    # 从腾讯获取涨停/跌停数(用涨幅/跌幅筛选)
    if HAS_MOOTDX:
        try:
            # 获取沪市+深市股票并筛选涨幅>9.8%的(涨停)
            sh = _dx.stocks(market=1)
            sz = _dx.stocks(market=0)
            all_codes = [str(s.get("code","")) for s in (list(sh) + list(sz))[:100]]
            if all_codes:
                quotes = _dx.quotes(symbols=all_codes[:80])
                if quotes is not None and len(quotes):
                    names = list(quotes[0].dtype.names)
                    pct_idx = names.index("pct_chg") if "pct_chg" in names else -1
                    if pct_idx >= 0:
                        up_count = sum(1 for q in quotes if float(q[pct_idx]) >= 9.8)
                        down_count = sum(1 for q in quotes if float(q[pct_idx]) <= -9.8)
                        stats["up"] = up_count
                        stats["down"] = down_count
                        stats["source"] = "mootdx"
        except Exception as e:
            log.warning(f"涨停统计失败: {e}")
    
    _set(ck, stats, CACHE["LIMIT"])
    return jsonify(stats)

@app.route("/limit/up")
def limit_up():
    """涨停池"""
    ck = "limit:up"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    stocks = []
    # Prefer synced data from daily_limit_up
    if HAS_PG:
        dt = _last_trade_date()
        if dt:
            rows = _pg_exec("SELECT dlu.code, dlu.continue_num, dlu.limit_type, dlu.turnover_rate, dlu.reason_type, dlu.reason_info, dlu.change_pct, dlu.amount, bs.name, bs.industry, COALESCE(dlu.reason_info, string_agg(DISTINCT bc.concept_name, ';' ORDER BY bc.concept_name)) as fallback_reason FROM daily_limit_up dlu LEFT JOIN base_stocks bs ON dlu.code = bs.code LEFT JOIN base_stock_concepts bsc ON dlu.code = bsc.code LEFT JOIN base_concepts bc ON bsc.concept_id = bc.concept_id WHERE dlu.trade_date=%s GROUP BY dlu.code, dlu.continue_num, dlu.limit_type, dlu.turnover_rate, dlu.reason_type, dlu.reason_info, dlu.change_pct, dlu.amount, bs.name, bs.industry ORDER BY dlu.continue_num DESC, dlu.change_pct DESC LIMIT 50", (dt,))
            if rows and len(rows) > 0:
                stocks = [{"code": r["code"], "name": r.get("name") or r["code"], "continueNum": r["continue_num"], "limitType": r["limit_type"], "changePercent": float(r["change_pct"] or 0), "amount": float(r["amount"] or 0), "reasonType": r["reason_type"] or "", "reasonInfo": r.get("reason_info") or r.get("fallback_reason") or "", "industry": r.get("industry") or ""} for r in rows]
                _set(ck, stocks, CACHE['LIMIT'])
                return jsonify({'data': stocks, 'source': 'synced', 'date': dt})
    if HAS_MOOTDX:
        try:
            sh = _dx.stocks(market=1)
            sz = _dx.stocks(market=0)
            all_codes = [str(s.get("code","")) for s in (list(sh) + list(sz))[:200]]
            if all_codes:
                quotes = _dx.quotes(symbols=all_codes[:80])
                if quotes is not None and len(quotes):
                    names = list(quotes[0].dtype.names)
                    for q in quotes:
                        pct = float(q[names.index("pct_chg")]) if "pct_chg" in names else 0
                        if pct >= 9.8:
                            stocks.append({
                                "code": str(q[names.index("code")]) if "code" in names else "",
                                "name": str(q[names.index("name")]) if "name" in names else "",
                                "price": float(q[names.index("price")]) if "price" in names else 0,
                                "changePercent": pct,
                                "volume": int(q[names.index("volume")]) if "volume" in names else 0,
                            })
        except: pass
    
    _set(ck, stocks, CACHE["LIMIT"])
    return jsonify({"data": stocks, "source": "mootdx" if stocks else "unavailable"})

# ─── 财务/估值 ────────────────────────────

@app.route("/finance/valuation")
def finance_valuation():
    """获取PE/PB/市值"""
    code = request.args.get("code","").strip()
    if len(code) != 6: return jsonify({"error":"无效代码"}), 400
    ck = f"val:{code}"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    valuation = {"code": code, "pe": 0, "pb": 0, "marketCap": 0, "source": "unavailable"}
    
    # 腾讯财务接口
    try:
        mkt = _mkt_tx(code)
        r = _http(f"https://qt.gtimg.cn/q={mkt}{code}", encoding="gbk")
        if r:
            inner = r.text.split('="',1)[1].rstrip('";\n')
            f = inner.split("~")
            if len(f) > 45:
                valuation["pe"] = float(f[39] or 0)  # PE
                valuation["marketCap"] = float(f[45] or 0)  # 总市值
                valuation["source"] = "tencent"
    except: pass
    
    # 东方财富
    try:
        mkt_code = f"1.{code}" if code[0]=="6" else f"0.{code}"
        r = _http(f"https://push2.eastmoney.com/api/qt/stock/get?secid={mkt_code}&fields=f20,f21,f115,f116,f117", referer="https://quote.eastmoney.com/")
        if r:
            d = r.json().get("data",{})
            if d:
                valuation["marketCap"] = d.get("f20", 0) or valuation.get("marketCap", 0)
                valuation["pe"] = d.get("f115", 0) or valuation.get("pe", 0)
                valuation["pb"] = d.get("f116", 0) or valuation.get("pb", 0)
                valuation["source"] = "eastmoney"
    except: pass
    
    _set(ck, valuation, CACHE["VALUATION"])
    return jsonify(valuation)

# ─── 龙虎榜 ───────────────────────────────

@app.route("/dragon/list")
def dragon_list():
    """龙虎榜(尽力获取)"""
    ck = "dragon:list"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    data = []
    # 东方财富龙虎榜
    try:
        r = _http("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205&fid=f62&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23", referer="https://data.eastmoney.com/")
        if r:
            diff = r.json().get("data",{}).get("diff",[])
            data = [{"code":d.get("f12",""),"name":d.get("f14",""),"price":d.get("f2",0),"changePercent":d.get("f3",0),"mainNetInflow":d.get("f62",0)} for d in diff]
    except: pass
    
    _set(ck, data, CACHE["DRAGON"])
    return jsonify({"data": data, "source": "eastmoney" if data else "unavailable"})

# ─── 资金流向 ─────────────────────────────

@app.route("/fund/flow")
def fund_flow():
    """大盘资金流向 (东财push2delay汇总)"""
    ck = "fund:flow:v2"
    cached = _get(ck)
    if cached: return jsonify(cached)
    flow = _em_fund_flow_market()
    if flow:
        dt = _last_trade_date()
        if dt: flow["date"] = dt
        _set(ck, flow, CACHE["FUND"])
        return jsonify(flow)
    dt = _last_trade_date()
    if dt and HAS_PG:
        try:
            rows = _pg_exec("SELECT sum(amount) as total_amount FROM daily_kline WHERE trade_date=%s", (dt,))
            if rows and rows[0]["total_amount"]:
                total = float(rows[0]["total_amount"])
                flow = {"mainNetInflow": 0, "superLargeNetInflow": 0, "largeNetInflow": 0, "mediumNetInflow": 0, "smallNetInflow": 0, "totalAmount": total, "date": dt, "source": "database"}
                _set(ck, flow, CACHE["FUND"])
                return jsonify(flow)
        except: pass
    flow = {"mainNetInflow": 0, "superLargeNetInflow": 0, "largeNetInflow": 0, "mediumNetInflow": 0, "smallNetInflow": 0, "source": "unavailable"}
    _set(ck, flow, CACHE["FUND"])
    return jsonify(flow)

@app.route("/fund/sector")
def fund_sector():
    """板块资金流向排名 (东财push2delay)"""
    ck = "fund:sector:v2"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _sector_fund_flow_v2()
    if not data:
        data = _db_sector_ranking()
    resp = {"data": data}
    if data: _set(ck, resp, CACHE["FUND"])
    return jsonify(resp)

@app.route("/fund/concept")
def fund_concept():
    """概念板块资金流 (桑基图数据源)"""
    ck = "fund:concept"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _concept_fund_flow()
    resp = {"data": data}
    if data: _set(ck, resp, CACHE["FUND"])
    return jsonify(resp)

@app.route("/fund/stock")
def fund_stock():
    """个股资金流排行 Top N"""
    top = min(int(request.args.get("top", 30)), 100)
    ck = f"fund:stock:{top}"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _stock_fund_flow(top)
    resp = {"data": data}
    if data: _set(ck, resp, CACHE["FUND"])
    return jsonify(resp)

@app.route("/fund/industry")
def fund_industry():
    """行业板块资金流"""
    ck = "fund:industry"
    cached = _get(ck)
    if cached: return jsonify(cached)
    items = _em_fund_clist("m:90+t:2", "f12,f14,f2,f3,f62,f64,f66,f68,f70,f184", "f62", 50)
    data = [{
        "code": d.get("f12",""), "name": d.get("f14",""),
        "changePercent": d.get("f3",0), "mainNetInflow": d.get("f62",0),
        "superLargeInflow": d.get("f64",0), "largeInflow": d.get("f66",0),
        "mediumInflow": d.get("f68",0), "smallInflow": d.get("f70",0),
        "maxInflow": d.get("f184",0),
    } for d in items]
    resp = {"data": data}
    if data: _set(ck, resp, CACHE["FUND"])
    return jsonify(resp)


# ─── 涨停同步 ─────────────────────────────

@app.route("/limit/sync")
def limit_sync():
    """从 quicktiny ladder API 同步涨停数据到 PG"""
    if not HAS_PG:
        return jsonify({"error": "PostgreSQL 不可用"}), 500
    
    try:
        r = requests.get("https://stock.quicktiny.cn/api/ladder", timeout=15,
                         headers={"User-Agent": "Mozilla/5.0", "Referer": "https://stock.quicktiny.cn/"})
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        return jsonify({"error": f"API 请求失败: {e}"}), 502
    
    dates = data.get("dates", [])
    if not dates:
        return jsonify({"error": "无数据"}), 404
    
    import psycopg2, datetime as dt_mod
    conn = psycopg2.connect(host="localhost", port=5432, dbname="quicktiny", user="quicktiny", password="quicktiny123")
    cur = conn.cursor()
    
    result = {"synced_dates": 0, "synced_stocks": 0, "new_stocks": 0, "new_concepts": 0}
    
    for day in dates[-3:]:
        ts = day["date"]
        td = f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}"
        day_cnt = 0
        
        for board in day.get("boards", []):
            for s in board.get("stocks", []):
                code = s.get("code", "")
                if len(code) != 6: continue
                
                try:
                    # base_stocks
                    mkt = "SH" if code[0] == "6" else ("SZ" if code[0] in "023" else "BJ")
                    cur.execute(
                        "INSERT INTO base_stocks (code, name, market, industry) VALUES (%s,%s,%s,%s) ON CONFLICT (code) DO NOTHING",
                        (code, s.get("name", code), mkt, s.get("industry", ""))
                    )
                    if cur.rowcount > 0: result["new_stocks"] += 1
                    
                    # daily_limit_up
                    fut = s.get("first_limit_up_time", "")
                    first_t = None
                    if fut and str(fut).isdigit():
                        first_t = dt_mod.datetime.fromtimestamp(int(fut)).strftime("%H:%M:%S")
                    
                    cur.execute("""
                        INSERT INTO daily_limit_up (code, trade_date, continue_num, first_limit_time,
                            seal_amount, open_count, limit_type, turnover_rate, amount, change_pct,
                            reason_type, reason_info, category)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (code, trade_date) DO NOTHING
                    """, (code, td,
                          s.get("continue_num", 1), first_t,
                          s.get("order_amount", 0), s.get("open_num", 0),
                          s.get("limit_up_type", ""), s.get("turnover_rate") or s.get("actual_turnover_rate", 0),
                          s.get("amount", 0), s.get("change_rate", 0),
                          (s.get("reason_type", "") or "")[:200], (s.get("reason_info", "") or "")[:5000],
                          s.get("auto_position", "")))
                    day_cnt += 1
                    
                    # stock_concepts via themes
                    themes = list(set([s.get("primary_theme","")] + (s.get("kpl_theme_tags") or [])))
                    for tname in themes[:5]:
                        if not tname: continue
                        cur.execute(
                            "INSERT INTO base_concepts (concept_id, concept_name, category) VALUES (COALESCE((SELECT max(concept_id)+1 FROM base_concepts), 90000), %s, %s) ON CONFLICT (concept_name) DO NOTHING",
                            (tname, "kpl")
                        )
                        cur.execute("SELECT concept_id FROM base_concepts WHERE concept_name=%s", (tname,))
                        row = cur.fetchone()
                        if row:
                            cur.execute("INSERT INTO base_stock_concepts (code, concept_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (code, row[0]))
                    
                except Exception as e:
                    log.warning(f"Sync {code} failed: {e}")
        
        conn.commit()
        result["synced_dates"] += 1
        result["synced_stocks"] += day_cnt
        log.info(f"Synced {td}: {day_cnt} stocks")
    
    cur.close()
    conn.close()
    result["new_concepts"] = result.get("new_concepts", 0)
    return jsonify(result)



# ─── 缓存管理 ─────────────────────────────

@app.route("/cache/stats")
def cache_stats():
    return jsonify({"entries": len(_cache), "keys": list(_cache.keys())[:50]})

@app.route("/cache/clear")
def cache_clear():
    n = len(_cache); _cache.clear()
    return jsonify({"cleared": n})

# ═══════════════════════════════════════════

if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════════╗
║   A股全数据桥 v3.0                       ║
║   端口: {PORT}  |  mootdx: {"✓" if HAS_MOOTDX else "✗"}  ║
║                                          ║
║   行情: /kline /minute /quote             ║
║   市场: /market/overview /market/index    ║
║   板块: /sector/ranking /sector/stocks    ║
║   概念: /concept/ranking /concept/stocks  ║
║   涨停: /limit/up /limit/stats            ║
║   资金: /fund/flow /fund/stock /fund/sector /fund/concept║
║   财务: /finance/valuation               ║
║   龙虎: /dragon/list                     ║
╚══════════════════════════════════════════╝
""")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
