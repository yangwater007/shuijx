"""
apps/bridge/main.py — FastAPI MCP Bridge Server
================================================
Provides 16 MCP tools + REST endpoints for frontend.
Flask -> FastAPI rewrite. Same tools, async-ready.
"""
import sys, os, json, logging, time
from pathlib import Path

# Load .env from project root
from dotenv import load_dotenv
ROOT = Path(__file__).resolve().parent.parent.parent
env_path = ROOT / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded: {env_path}")
else:
    print(f"[ENV] No .env found at {env_path}, using system env or defaults")

# Add root to path so ths_bridge_v3 is importable
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO, format="[FASTAPI] %(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("fastapi")

app = FastAPI(title="QuickTiny Bridge", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Tool Registry -----
from tools import ALL_TOOLS

# ===================== MCP JSON-RPC =====================

@app.post("/mcp")
async def mcp_handler(request: Request):
    """JSON-RPC 2.0 - DeepSeek function calling bridge"""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None},
            status_code=400
        )

    msg_id = body.get("id", 0)
    method = body.get("method", "")
    params = body.get("params", {})

    if method == "tools/list":
        tools = [{
            "name": name,
            "description": t["description"],
            "inputSchema": {"type": "object", "properties": {}},
        } for name, t in ALL_TOOLS.items()]
        return {"jsonrpc": "2.0", "id": msg_id, "result": {"tools": tools}}

    elif method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})

        if tool_name not in ALL_TOOLS:
            return JSONResponse(
                {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}}
            )

        try:
            start = time.time()
            result_text = ALL_TOOLS[tool_name]["handler"](tool_args)
            elapsed = (time.time() - start) * 1000
            log.info(f"{tool_name} -> {elapsed:.0f}ms")
            return {
                "jsonrpc": "2.0", "id": msg_id,
                "result": {"content": [{"type": "text", "text": result_text}]}
            }
        except Exception as e:
            log.error(f"{tool_name} failed: {e}")
            return {
                "jsonrpc": "2.0", "id": msg_id,
                "result": {"content": [{"type": "text", "text": f"[{tool_name}] error: {e}"}]}
            }

    else:
        return JSONResponse(
            {"jsonrpc": "2.0", "id": msg_id, "error": {"code": -32601, "message": f"Unknown method: {method}"}}
        )

# ===================== REST Endpoints =====================

@app.get("/health")
def health():
    return {"status": "ok", "tools": len(ALL_TOOLS), "framework": "fastapi"}


@app.get("/kline")
def rest_kline(code: str = Query(..., min_length=6, max_length=6), count: int = Query(60, ge=1, le=365)):
    from ths_bridge_v3 import _fetch_kline_source
    data, src = _fetch_kline_source(code, count)
    return {"code": code, "count": len(data), "source": src, "data": data}


@app.get("/minute")
def rest_minute(code: str = Query(..., min_length=6, max_length=6)):
    from ths_bridge_v3 import _fetch_minute_source
    data, src = _fetch_minute_source(code)
    return {"code": code, "source": src, "data": data}


@app.get("/market/overview")
def rest_market_overview():
    from ths_bridge_v3 import _market_overview, _get_effective_date, _is_trading_day, _pg_exec, HAS_PG
    data = _market_overview()
    dt = _get_effective_date()
    data["tradeDate"] = dt
    data["isTradingDay"] = _is_trading_day()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct > 0) as up, "
            "count(*) FILTER (WHERE change_pct < 0) as down, "
            "count(*) FILTER (WHERE change_pct = 0) as flat "
            "FROM daily_kline WHERE trade_date=%s", (dt,))
        if rows:
            data["up"] = rows[0]["up"] or 0
            data["down"] = rows[0]["down"] or 0
            data["flat"] = rows[0]["flat"] or 0
            data["total"] = (data["up"] or 0) + (data["down"] or 0) + (data["flat"] or 0)
    return data


@app.get("/sector/ranking")
def rest_sector_ranking():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bs.industry as name, round(avg(dk.change_pct)::numeric,2) as change_pct, count(*) as stock_cnt "
            "FROM daily_kline dk LEFT JOIN base_stocks bs ON dk.code=bs.code "
            "WHERE dk.trade_date=%s AND bs.industry IS NOT NULL AND bs.industry!='' "
            "GROUP BY bs.industry ORDER BY change_pct DESC LIMIT 30", (dt,))
        if rows:
            return {"data": [dict(r) for r in rows], "tradeDate": dt, "source": "database"}
    return {"data": [], "source": "unavailable"}


@app.get("/concept/ranking")
def rest_concept_ranking():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bc.concept_name as name, round(avg(dk.change_pct)::numeric,2) as change_pct, count(*) as stock_cnt "
            "FROM daily_kline dk "
            "LEFT JOIN base_stock_concepts bsc ON dk.code=bsc.code "
            "LEFT JOIN base_concepts bc ON bsc.concept_id=bc.concept_id "
            "WHERE dk.trade_date=%s AND bc.concept_name IS NOT NULL AND bc.category='em' "
            "GROUP BY bc.concept_name ORDER BY change_pct DESC LIMIT 30", (dt,))
        if rows:
            return {"data": [dict(r) for r in rows], "tradeDate": dt, "source": "database"}
    return {"data": [], "source": "unavailable"}


@app.get("/fund/flow")
def rest_fund_flow():
    from ths_bridge_v3 import _em_fund_flow_market, _get_effective_date
    flow = _em_fund_flow_market()
    if flow:
        flow["tradeDate"] = _get_effective_date()
    return flow or {"mainNetInflow": 0, "source": "unavailable"}


@app.get("/fund/concept")
def rest_fund_concept():
    from ths_bridge_v3 import _concept_fund_flow
    return {"data": _concept_fund_flow()}


@app.get("/fund/stock")
def rest_fund_stock(top: int = Query(30, ge=1, le=100)):
    from ths_bridge_v3 import _stock_fund_flow
    return {"data": _stock_fund_flow(top)}


@app.get("/limit/stats")
def rest_limit_stats():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG, _is_trading_day
    dt = _get_effective_date()
    if HAS_PG and dt:
        up_rows = _pg_exec("SELECT count(*) as c FROM daily_limit_up WHERE trade_date=%s", (dt,))
        up = up_rows[0]["c"] if up_rows else 0
        down_rows = _pg_exec("SELECT count(*) FILTER (WHERE change_pct<=-9.8) as down_cnt FROM daily_kline WHERE trade_date=%s", (dt,))
        down = down_rows[0]["down_cnt"] if down_rows else 0
        broken_rows = _pg_exec("SELECT count(*) as c FROM daily_limit_up WHERE trade_date=%s AND open_count>0", (dt,))
        broken = broken_rows[0]["c"] if broken_rows else 0
        return {
            "up": up, "down": down, "broken": broken,
            "sealRate": round((up/(up+broken)*100), 1) if (up+broken) > 0 else 0,
            "tradeDate": dt, "isTradingDay": _is_trading_day(), "source": "database"
        }
    return {"up": 0, "down": 0, "broken": 0, "sealRate": 0, "source": "unavailable"}


@app.get("/limit/up")
def rest_limit_up():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG, _is_trading_day
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT dlu.code, bs.name, dlu.continue_num, dlu.change_pct, dlu.turnover_rate, "
            "dlu.reason_type, dlu.reason_info, bs.industry "
            "FROM daily_limit_up dlu LEFT JOIN base_stocks bs ON dlu.code=bs.code "
            "WHERE dlu.trade_date=%s ORDER BY dlu.continue_num DESC LIMIT 50", (dt,))
        if rows:
            return {
                "data": [{k: (float(v) if k in ("change_pct", "turnover_rate") else v) for k, v in dict(r).items()} for r in rows],
                "tradeDate": dt, "isTradingDay": _is_trading_day(), "source": "database"
            }
    return {"data": [], "source": "unavailable"}


@app.get("/limit/bigloser")
def rest_limit_bigloser():
    from ths_bridge_v3 import _get_effective_date, _last_trade_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    result = {"bigLosers": [], "nuclearButtons": [], "tradeDate": dt}
    if HAS_PG and dt:
        bl = _pg_exec(
            "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
            "LEFT JOIN base_stocks bs ON dk.code=bs.code "
            "WHERE dk.trade_date=%s AND dk.change_pct<=-10", (dt,))
        if bl:
            result["bigLosers"] = [{"code": r["code"], "name": r.get("name", ""), "changePercent": float(r["change_pct"] or 0)} for r in bl]
        yest = _last_trade_date()
        if yest and yest != dt:
            nb = _pg_exec(
                "SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk "
                "LEFT JOIN base_stocks bs ON dk.code=bs.code "
                "WHERE dk.trade_date=%s AND dk.change_pct<=-9.8 "
                "AND dk.code IN (SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if nb:
                result["nuclearButtons"] = [{"code": r["code"], "name": r.get("name", ""), "changePercent": float(r["change_pct"] or 0)} for r in nb]
    return result


@app.get("/limit/yesterday-premium")
def rest_yesterday_premium():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    result = {"avgReturn": 0, "count": 0, "date": dt}
    if HAS_PG and dt:
        ye = _pg_exec("SELECT max(trade_date) FROM daily_kline WHERE trade_date<%s", (dt,))
        if ye:
            yest = str(ye[0]["max"])
            rows = _pg_exec(
                "SELECT dk.change_pct FROM daily_kline dk "
                "WHERE dk.trade_date=%s AND dk.code IN "
                "(SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if rows:
                rets = [float(r["change_pct"] or 0) for r in rows]
                result["avgReturn"] = round(sum(rets) / len(rets), 2) if rets else 0
                result["count"] = len(rets)
    return result


@app.get("/review/history")
def rest_review_history(days: int = Query(20, ge=1, le=60)):
    from ths_bridge_v3 import _pg_exec, HAS_PG
    result = {"days": []}
    if HAS_PG:
        rows = _pg_exec(
            "SELECT trade_date, count(*) FILTER (WHERE change_pct>=9.8) as up, "
            "count(*) FILTER (WHERE change_pct<=-9.8) as down, "
            "round(avg(change_pct)::numeric,2) as avg_pct, sum(amount) as amt "
            "FROM daily_kline WHERE trade_date>=(SELECT max(trade_date) FROM daily_kline)-INTERVAL '%s days' "
            "GROUP BY trade_date ORDER BY trade_date DESC LIMIT %s", (days * 2, days))
        if rows:
            result["days"] = [{
                "date": str(r["trade_date"])[:10],
                "upCount": int(r["up"] or 0),
                "downCount": int(r["down"] or 0),
                "avgChange": float(r["avg_pct"] or 0),
                "totalAmount": float(r["amt"] or 0),
            } for r in rows]
    return result


# ===================== Startup =====================

if __name__ == "__main__":
    import uvicorn
    print(f"""
  FastAPI Bridge v2.0
  ===================
  MCP:    http://localhost:8000/mcp
  Health: http://localhost:8000/health
  Docs:   http://localhost:8000/docs
  Tools:  {len(ALL_TOOLS)} available
  DB:     {os.getenv('DATABASE_URL', 'Docker default')[:50]}...
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
