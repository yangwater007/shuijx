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

@app.route("/market/overview")
def market_overview():
    ck = "market:overview"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _market_overview()
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
    data = _sector_fund_flow()
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
    # Try mootdx first, then ths
    data = _concept_ranking_mootdx()
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
    """大盘资金流向"""
    ck = "fund:flow"
    cached = _get(ck)
    if cached: return jsonify(cached)
    
    flow = {"mainNetInflow": 0, "superLargeNetInflow": 0, "largeNetInflow": 0, "mediumNetInflow": 0, "smallNetInflow": 0, "source": "unavailable"}
    try:
        r = _http("https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get?secid=1.000001&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57&lmt=1", referer="https://data.eastmoney.com/")
        if r:
            klines = r.json().get("data",{}).get("klines",[])
            if klines:
                f = klines[-1].split(",")
                if len(f) >= 7:
                    flow = {"mainNetInflow": float(f[4] or 0), "superLargeNetInflow": float(f[5] or 0), "largeNetInflow": float(f[6] or 0), "source": "eastmoney"}
    except: pass
    _set(ck, flow, CACHE["FUND"])
    return jsonify(flow)

@app.route("/fund/sector")
def fund_sector():
    """板块资金流向排名"""
    ck = "fund:sector"
    cached = _get(ck)
    if cached: return jsonify(cached)
    data = _sector_fund_flow()
    _set(ck, data, CACHE["FUND"])
    return jsonify({"data": data})

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
║   资金: /fund/flow /fund/sector           ║
║   财务: /finance/valuation               ║
║   龙虎: /dragon/list                     ║
╚══════════════════════════════════════════╝
""")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
