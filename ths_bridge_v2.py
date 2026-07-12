# -*- coding: utf-8 -*-
"""
ths_bridge_v2.py — A股数据桥 HTTP 服务
=====================================
为前端 stockChart.ts 提供本地数据代理，解决跨域和稳定性问题。

端点：
  GET /health              — 健康检查
  GET /kline?code=XXXXXX&count=60     — 日K线 (OHLCV)
  GET /minute?code=XXXXXX              — 今日分时数据
  GET /quote?codes=XXX,YYY             — 实时行情快照
  GET /batch_kline?codes=XXX,YYY&count=60 — 批量K线

数据源优先级（自动回退）：
  1. mootdx (通达信 TCP) — 实时行情 + 历史K线
  2. 同花顺 10jqka.com.cn — JSONP K线/分时
  3. 腾讯财经 qt.gtimg.cn — 行情快照

依赖安装：
  pip install flask flask-cors mootdx requests

启动：
  python ths_bridge_v2.py
  (默认监听 0.0.0.0:8765)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import threading
import requests
import logging

# ─── 日志 ─────────────────────────────────
logging.basicConfig(level=logging.INFO, format="[BRIDGE] %(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("bridge")

# ─── 尝试导入 mootdx（可选，未安装时跳过） ──
try:
    from mootdx.quotes import Quotes
    _mootdx_client = Quotes.factory(market="std", timeout=8)
    HAS_MOOTDX = True
    log.info("mootdx 已连接 (通达信标准行情)")
except Exception as e:
    _mootdx_client = None
    HAS_MOOTDX = False
    log.warning(f"mootdx 不可用: {e}，将使用同花顺/腾讯作为数据源")

# ─── Flask 应用 ───────────────────────────
app = Flask(__name__)
CORS(app)  # 允许前端跨域

PORT = 8765

# ─── 缓存（减少对外请求） ──────────────────
_cache: dict[str, tuple[float, object]] = {}  # key -> (expire_ts, data)
CACHE_TTL_KLINE = 300     # K线缓存 5 分钟
CACHE_TTL_MINUTE = 30     # 分时缓存 30 秒（盘中需实时）
CACHE_TTL_QUOTE = 10      # 行情缓存 10 秒
CACHE_TTL_CONCEPT = 3600  # 题材缓存 1 小时

def cache_get(key: str) -> object | None:
    entry = _cache.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    _cache.pop(key, None)
    return None

def cache_set(key: str, data: object, ttl: int):
    _cache[key] = (time.time() + ttl, data)

# ─── 工具函数 ────────────────────────────

def get_market_prefix(code: str) -> str:
    """通达信市场前缀: 0=深圳, 1=上海, 2=北京"""
    c = code[0]
    if c == "6": return "1"   # 上海
    if c in ("0", "2", "3"): return "0"  # 深圳
    if c in ("4", "8", "9"): return "2"  # 北京
    return "0"

def get_ths_market(code: str) -> str:
    """同花顺市场前缀: hs(沪), sz(深), bj(京)"""
    c = code[0]
    if c == "6": return "hs"
    if c in ("0", "2", "3"): return "sz"
    if c in ("4", "8", "9"): return "bj"
    return "sz"

def get_tencent_market(code: str) -> str:
    """腾讯市场前缀: sh, sz, bj"""
    c = code[0]
    if c == "6": return "sh"
    if c in ("0", "2", "3"): return "sz"
    if c in ("4", "8", "9"): return "bj"
    return "sz"

def parse_ths_kl_text(text: str) -> list[dict]:
    """解析同花顺 K线文本: 日期,开盘,最高,最低,收盘,成交量,成交额"""
    result = []
    for line in text.split(";"):
        line = line.strip()
        if not line: continue
        p = line.split(",")
        if len(p) < 6: continue
        try:
            result.append({
                "date": p[0],
                "open": float(p[1]),
                "high": float(p[2]),
                "low": float(p[3]),
                "close": float(p[4]),
                "volume": int(float(p[5])),
                "amount": float(p[6]) if len(p) > 6 else 0,
            })
        except (ValueError, IndexError):
            continue
    return result

def parse_ths_min_text(text: str) -> list[dict]:
    """解析同花顺分时文本: 时间,价格,成交量,成交额"""
    result = []
    for line in text.split(";"):
        line = line.strip()
        if not line: continue
        p = line.split(",")
        if len(p) < 3: continue
        try:
            result.append({
                "time": p[0],
                "price": float(p[1]),
                "volume": int(float(p[2])),
            })
        except (ValueError, IndexError):
            continue
    return result


# ═══════════════════════════════════════════
#  数据源实现
# ═══════════════════════════════════════════

def fetch_kline_mootdx(code: str, count: int = 60) -> list[dict] | None:
    """mootdx 获取日K线"""
    if not HAS_MOOTDX or _mootdx_client is None:
        return None
    try:
        market = int(get_market_prefix(code))
        # frequency=9 表示日线
        data = _mootdx_client.bars(symbol=code, frequency=9, start=0, offset=count)
        if data is None or len(data) == 0:
            return None
        result = []
        for row in data:
            result.append({
                "date": str(row.get("date", "")),
                "open": float(row.get("open", 0)),
                "high": float(row.get("high", 0)),
                "low": float(row.get("low", 0)),
                "close": float(row.get("close", 0)),
                "volume": int(row.get("volume", 0)),
                "amount": float(row.get("amount", 0)),
            })
        return result
    except Exception as e:
        log.warning(f"mootdx K线获取失败 {code}: {e}")
        return None

def fetch_kline_ths(code: str, count: int = 60) -> list[dict] | None:
    """同花顺 10jqka 获取日K线 (JSONP)"""
    try:
        market = get_ths_market(code)
        url = f"https://d.10jqka.com.cn/v2/line/{market}_{code}/01/last.js"
        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": "https://www.10jqka.com.cn/",
        })
        resp.raise_for_status()
        text = resp.text
        # 剥离 JSONP 外壳: _callback_1234_5678({...})
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return None
        import json
        obj = json.loads(text[start:end+1])
        raw = obj.get("data", "")
        if not raw:
            return None
        all_data = parse_ths_kl_text(raw)
        return all_data[-count:] if len(all_data) > count else all_data
    except Exception as e:
        log.warning(f"同花顺K线获取失败 {code}: {e}")
        return None

def fetch_kline_tencent(code: str, count: int = 60) -> list[dict] | None:
    """腾讯财经获取日K线"""
    try:
        market = get_tencent_market(code)
        url = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={market}{code},day,,,{count},qfq"
        resp = requests.get(url, timeout=10, headers={
            "Referer": "https://finance.qq.com/",
        })
        resp.raise_for_status()
        obj = resp.json()
        stock_data = obj.get("data", {}).get(f"{market}{code}", {})
        klines = stock_data.get("qfqday") or stock_data.get("day") or []
        result = []
        for row in klines:
            if len(row) < 6: continue
            result.append({
                "date": row[0],
                "open": float(row[1]),
                "close": float(row[2]),
                "high": float(row[3]),
                "low": float(row[4]),
                "volume": int(float(row[5])),
            })
        return result
    except Exception as e:
        log.warning(f"腾讯K线获取失败 {code}: {e}")
        return None

def fetch_minute_mootdx(code: str, date_str: str = "") -> list[dict] | None:
    """mootdx 获取分时数据"""
    if not HAS_MOOTDX or _mootdx_client is None:
        return None
    try:
        market = int(get_market_prefix(code))
        data = _mootdx_client.minutes(symbol=code, date=date_str) if date_str else _mootdx_client.minutes(symbol=code)
        if data is None or len(data) == 0:
            return None
        result = []
        for row in data:
            result.append({
                "time": str(row.get("time", "")),
                "price": float(row.get("price", 0)),
                "volume": int(row.get("volume", 0)),
                "amount": float(row.get("amount", 0)),
            })
        return result
    except Exception as e:
        log.warning(f"mootdx 分时获取失败 {code}: {e}")
        return None

def fetch_minute_ths(code: str) -> list[dict] | None:
    """同花顺获取分时数据"""
    try:
        market = get_ths_market(code)
        url = f"https://d.10jqka.com.cn/v2/time/{market}_{code}/last.js"
        resp = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://www.10jqka.com.cn/",
        })
        resp.raise_for_status()
        text = resp.text
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            return None
        import json
        obj = json.loads(text[start:end+1])
        raw = obj.get("data", "")
        if not raw:
            return None
        return parse_ths_min_text(raw)
    except Exception as e:
        log.warning(f"同花顺分时获取失败 {code}: {e}")
        return None

def fetch_minute_tencent(code: str) -> list[dict] | None:
    """腾讯获取分时数据"""
    try:
        market = get_tencent_market(code)
        url = f"https://ifzq.gtimg.cn/appstock/app/minute/query?code={market}{code}"
        resp = requests.get(url, timeout=10, headers={"Referer": "https://finance.qq.com/"})
        resp.raise_for_status()
        obj = resp.json()
        stock_data = obj.get("data", {}).get(f"{market}{code}", {})
        data_wrapper = stock_data.get("data", {})
        raw_lines = data_wrapper.get("data", [])
        result = []
        for line in raw_lines:
            parts = line.split(" ")
            if len(parts) < 3: continue
            result.append({
                "time": parts[0],
                "price": float(parts[1]),
                "volume": int(float(parts[2])),
            })
        return result
    except Exception as e:
        log.warning(f"腾讯分时获取失败 {code}: {e}")
        return None

def fetch_quote_mootdx(codes: list[str]) -> list[dict] | None:
    """mootdx 获取实时行情"""
    if not HAS_MOOTDX or _mootdx_client is None:
        return None
    try:
        data = _mootdx_client.quotes(symbols=codes)
        if data is None or len(data) == 0:
            return None
        result = []
        for row in data:
            result.append({
                "code": str(row.get("code", "")),
                "name": str(row.get("name", "")),
                "price": float(row.get("price", 0)),
                "preClose": float(row.get("pre_close", 0) if "pre_close" in row.dtype.names else row.get("last_close", 0)),
                "open": float(row.get("open", 0)),
                "high": float(row.get("high", 0)),
                "low": float(row.get("low", 0)),
                "volume": int(row.get("volume", 0)),
                "amount": float(row.get("amount", 0)),
                "changePercent": float(row.get("pct_chg", 0) if "pct_chg" in row.dtype.names else 0),
            })
        return result
    except Exception as e:
        log.warning(f"mootdx 行情获取失败: {e}")
        return None

def fetch_quote_tencent(codes: list[str]) -> list[dict] | None:
    """腾讯获取实时行情"""
    try:
        # 构建腾讯格式: sh600036,sz000001
        tc_codes = []
        for c in codes:
            mkt = get_tencent_market(c)
            tc_codes.append(f"{mkt}{c}")
        url = f"https://qt.gtimg.cn/q={','.join(tc_codes)}"
        resp = requests.get(url, timeout=5, headers={"Referer": "https://finance.qq.com/"})
        resp.raise_for_status()
        # 解析腾讯 GBK 编码的返回
        resp.encoding = "gbk"
        text = resp.text

        result = []
        for line in text.strip().split("\n"):
            line = line.strip()
            if not line or '="' not in line:
                continue
            # 格式: v_sh600036="1~贵州茅台~600519~..."
            inner = line.split('="', 1)[1].rstrip('";\n')
            fields = inner.split("~")
            if len(fields) < 10:
                continue
            code_raw = fields[2] if len(fields) > 2 else ""
            result.append({
                "code": code_raw,
                "name": fields[1] if len(fields) > 1 else "",
                "price": float(fields[3] or 0),
                "preClose": float(fields[4] or 0),
                "open": float(fields[5] or 0),
                "volume": int(float(fields[6] or 0)),
                "high": float(fields[33] or 0) if len(fields) > 33 else 0,
                "low": float(fields[34] or 0) if len(fields) > 34 else 0,
                "amount": float(fields[37] or 0) if len(fields) > 37 else 0,
                "changePercent": float(fields[32] or 0) if len(fields) > 32 else 0,
            })
        return result if result else None
    except Exception as e:
        log.warning(f"腾讯行情获取失败: {e}")
        return None


# ═══════════════════════════════════════════
#  路由端点
# ═══════════════════════════════════════════

@app.route("/health")
def health():
    """健康检查，返回各数据源状态"""
    return jsonify({
        "status": "ok",
        "mootdx": HAS_MOOTDX,
        "timestamp": time.time(),
    })

@app.route("/kline")
def kline():
    """
    获取日K线
    GET /kline?code=600519&count=60
    返回: { code, count, source, data: [{date, open, high, low, close, volume, amount}] }
    """
    code = request.args.get("code", "").strip()
    if not code or len(code) != 6:
        return jsonify({"error": "无效的股票代码", "code": code}), 400

    count = int(request.args.get("count", 60))
    count = max(1, min(count, 365))  # 限制 1-365

    cache_key = f"kl:{code}:{count}"
    cached = cache_get(cache_key)
    if cached is not None:
        return jsonify(cached)

    # 三级回退
    source = "cache"
    data = None
    for fetcher, name in [
        (lambda: fetch_kline_mootdx(code, count), "mootdx"),
        (lambda: fetch_kline_ths(code, count), "ths"),
        (lambda: fetch_kline_tencent(code, count), "tencent"),
    ]:
        try:
            data = fetcher()
        except Exception:
            data = None
        if data and len(data) > 0:
            source = name
            break

    result = {
        "code": code,
        "count": count,
        "source": source,
        "data": data or [],
    }
    cache_set(cache_key, result, CACHE_TTL_KLINE)
    return jsonify(result)

@app.route("/minute")
def minute():
    """
    获取今日分时数据
    GET /minute?code=600519
    返回: { code, source, data: [{time, price, volume}] }
    """
    code = request.args.get("code", "").strip()
    if not code or len(code) != 6:
        return jsonify({"error": "无效的股票代码", "code": code}), 400

    cache_key = f"min:{code}"
    cached = cache_get(cache_key)
    if cached is not None:
        return jsonify(cached)

    source = "cache"
    data = None
    for fetcher, name in [
        (lambda: fetch_minute_mootdx(code), "mootdx"),
        (lambda: fetch_minute_ths(code), "ths"),
        (lambda: fetch_minute_tencent(code), "tencent"),
    ]:
        try:
            data = fetcher()
        except Exception:
            data = None
        if data and len(data) > 0:
            source = name
            break

    result = {
        "code": code,
        "source": source,
        "data": data or [],
    }
    cache_set(cache_key, result, CACHE_TTL_MINUTE)
    return jsonify(result)

@app.route("/quote")
def quote():
    """
    获取实时行情快照
    GET /quote?codes=600519,000858,300750
    返回: { source, data: [{code, name, price, preClose, open, high, low, volume, amount, changePercent}] }
    """
    codes_str = request.args.get("codes", "").strip()
    if not codes_str:
        return jsonify({"error": "缺少股票代码"}), 400

    codes = [c.strip() for c in codes_str.split(",") if len(c.strip()) == 6]
    if not codes:
        return jsonify({"error": "无效的股票代码"}), 400

    # 行情缓存时间短
    cache_key = f"qt:{','.join(sorted(codes))}"
    cached = cache_get(cache_key)
    if cached is not None:
        return jsonify(cached)

    source = "cache"
    data = None
    for fetcher, name in [
        (lambda: fetch_quote_mootdx(codes), "mootdx"),
        (lambda: fetch_quote_tencent(codes), "tencent"),
    ]:
        try:
            data = fetcher()
        except Exception:
            data = None
        if data and len(data) > 0:
            source = name
            break

    result = {
        "source": source,
        "data": data or [],
    }
    cache_set(cache_key, result, CACHE_TTL_QUOTE)
    return jsonify(result)

@app.route("/batch_kline")
def batch_kline():
    """
    批量获取多只股票的K线
    GET /batch_kline?codes=600519,000858&count=60
    返回: { source, data: { "600519": [...], "000858": [...] } }
    """
    codes_str = request.args.get("codes", "").strip()
    if not codes_str:
        return jsonify({"error": "缺少股票代码"}), 400

    codes = [c.strip() for c in codes_str.split(",") if len(c.strip()) == 6]
    count = int(request.args.get("count", 60))
    count = max(1, min(count, 365))

    result_data = {}
    source = "mixed"

    for code in codes:
        cache_key = f"kl:{code}:{count}"
        cached = cache_get(cache_key)
        if cached is not None:
            result_data[code] = cached.get("data", [])
            continue

        data = None
        for fetcher, name in [
            (lambda c=code: fetch_kline_mootdx(c, count), "mootdx"),
            (lambda c=code: fetch_kline_ths(c, count), "ths"),
            (lambda c=code: fetch_kline_tencent(c, count), "tencent"),
        ]:
            try:
                data = fetcher()
            except Exception:
                data = None
            if data:
                source = name
                break

        result_data[code] = data or []
        cache_set(cache_key, {"code": code, "count": count, "source": source, "data": data or []}, CACHE_TTL_KLINE)

    return jsonify({"source": source, "data": result_data})

# ─── 缓存管理 ────────────────────────────

@app.route("/cache/clear")
def cache_clear():
    """清空所有缓存"""
    count = len(_cache)
    _cache.clear()
    return jsonify({"cleared": count})

@app.route("/cache/stats")
def cache_stats():
    """缓存统计"""
    return jsonify({
        "entries": len(_cache),
        "keys": list(_cache.keys())[:20],
    })


# ═══════════════════════════════════════════
#  启动
# ═══════════════════════════════════════════

if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════════╗
║   A股数据桥 v2.0                        ║
║   端口: {PORT}                            ║
║   mootdx: {"✓ 可用" if HAS_MOOTDX else "✗ 不可用 (将使用同花顺/腾讯)"}    ║
║   端点:                                  ║
║     /health     - 健康检查                ║
║     /kline      - 日K线                  ║
║     /minute     - 分时数据                ║
║     /quote      - 实时行情                ║
║     /batch_kline - 批量K线               ║
║     /cache/stats - 缓存统计               ║
║     /cache/clear - 清空缓存               ║
╚══════════════════════════════════════════╝
""")
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
