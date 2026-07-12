
"""
???/??? ?????
????????????????????????????????????????
?? mootdx ????? TCP ???, ?? HTTP API
    ??: python ths_bridge.py
    ??: http://localhost:8765
"""

import json, time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from functools import lru_cache

from mootdx.quotes import Quotes

client = Quotes.factory(market="std")

# ?? ?? ??
def cache_key(*args, **kw):
    return json.dumps((args, kw))

def ttl_cache(seconds=60):
    """??TTL??"""
    store: dict[str, tuple[float, object]] = {}
    def deco(fn):
        def wrapper(*a, **kw):
            key = fn.__name__ + ":" + cache_key(*a, **kw)
            now = time.time()
            if key in store and now - store[key][0] < seconds:
                return store[key][1]
            result = fn(*a, **kw)
            store[key] = (now, result)
            return result
        return wrapper
    return deco

# ?? ???? ??

@ttl_cache(30)
def get_kline(code: str, count: int = 60):
    """?K?"""
    market = 1 if code.startswith("6") else 0
    df = client.bars(symbol=code, frequency=9, offset=count)
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "date": f"{int(r['year'])}-{int(r['month']):02d}-{int(r['day']):02d}",
            "open": round(float(r["open"]), 2),
            "high": round(float(r["high"]), 2),
            "low": round(float(r["low"]), 2),
            "close": round(float(r["close"]), 2),
            "volume": int(r["vol"]),
            "amount": float(r.get("amount", 0)),
        })
    return rows

@ttl_cache(10)
def get_minute(code: str):
    """???"""
    market = 1 if code.startswith("6") else 0
    df = client.minute(symbol=code)
    if df is None or len(df) == 0:
        return []
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "time": str(r.get("time", "")),
            "price": round(float(r.get("price", 0)), 2),
            "volume": int(r.get("vol", 0)),
        })
    return rows

@ttl_cache(5)
def get_quotes(codes: list[str]):
    """????"""
    df = client.quotes(symbol=codes)
    rows = []
    for _, r in df.iterrows():
        if r.get("code", "") == "": continue
        rows.append({
            "code": str(r.get("code", "")),
            "name": str(r.get("name", "")),
            "price": round(float(r.get("price", 0)), 2),
            "open": round(float(r.get("open", 0)), 2),
            "high": round(float(r.get("high", 0)), 2),
            "low": round(float(r.get("low", 0)), 2),
            "preClose": round(float(r.get("pre_close", r.get("last_close", 0))), 2),
            "change": round(float(r.get("change", 0)), 2),
            "changePercent": round(float(r.get("change_pct", r.get("pct", 0))), 2),
            "volume": int(r.get("vol", 0)),
            "amount": float(r.get("amount", 0)),
        })
    return rows

@ttl_cache(30)
def get_index_bars(code: str, count: int = 5):
    """??K?"""
    df = client.index_bars(symbol=code, frequency=9, offset=count)
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "date": f"{int(r['year'])}-{int(r['month']):02d}-{int(r['day']):02d}",
            "open": round(float(r["open"]), 2),
            "high": round(float(r["high"]), 2),
            "low": round(float(r["low"]), 2),
            "close": round(float(r["close"]), 2),
            "volume": int(r["vol"]),
        })
    return rows

# ?? HTTP Server ??

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass  # ??

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        path = u.path.rstrip("/")

        try:
            if path == "/health":
                self._json({"status": "ok", "server": "mootdx/tdx"})

            elif path == "/kline":
                code = q.get("code", [""])[0]
                count = int(q.get("count", ["60"])[0])
                if not code:
                    self._json({"error": "code required"}, 400)
                    return
                rows = get_kline(code, count)
                self._json({"code": code, "count": len(rows), "data": rows})

            elif path == "/minute":
                code = q.get("code", [""])[0]
                if not code:
                    self._json({"error": "code required"}, 400)
                    return
                rows = get_minute(code)
                self._json({"code": code, "count": len(rows), "data": rows})

            elif path == "/quote":
                codes = q.get("codes", [""])[0].split(",")
                codes = [c.strip() for c in codes if c.strip()]
                if not codes:
                    self._json({"error": "codes required"}, 400)
                    return
                rows = get_quotes(codes)
                self._json({"codes": codes, "data": rows})

            elif path == "/indices":
                rows = get_index_bars("000001", 3)
                self._json({"data": rows})

            elif path == "/index":
                code = q.get("code", ["000001"])[0]
                count = int(q.get("count", ["60"])[0])
                rows = get_index_bars(code, count)
                self._json({"code": code, "count": len(rows), "data": rows})

            else:
                self._json({
                    "endpoints": {
                        "/health": "????",
                        "/kline?code=600519&count=60": "?K?",
                        "/minute?code=600519": "???",
                        "/quote?codes=600519,000001": "????",
                        "/indices": "??????",
                        "/index?code=000001&count=60": "??K?",
                    }
                })

        except Exception as e:
            self._json({"error": str(e)}, 500)


def main():
    port = 8765
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"""
????????????????????????????????????????
?  ???/??? ????? v1.0       ?
?  HTTP API: http://localhost:{port}    ?
?  Ctrl+C ??                         ?
????????????????????????????????????????
????:
  GET /health              ? ????
  GET /kline?code=600519   ? ?K? (count=60)
  GET /minute?code=600519  ? ???
  GET /quote?codes=a,b,c   ? ????
  GET /indices             ? ????
  GET /index?code=000001   ? ??K?
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n???")
        server.shutdown()


if __name__ == "__main__":
    main()
