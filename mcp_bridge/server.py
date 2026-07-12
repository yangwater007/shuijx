
"""
mcp_bridge/server.py ? Local MCP Bridge Server (JSON-RPC 2.0)
=============================================================
Provides 18 MCP tools backed by our own Bridge data (mootdx/ths/tencent/PG).
DeepSeek calls this via function calling, ensuring it always uses real data.

Start: python mcp_bridge/server.py
Port: 8766
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json, logging, time

logging.basicConfig(level=logging.INFO, format="[MCP] %(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("mcp")

app = Flask(__name__)
CORS(app)

from tools import ALL_TOOLS

# ??? JSON-RPC 2.0 Handler ???

@app.route("/mcp", methods=["POST"])
def mcp_handler():
    """Main MCP endpoint ? JSON-RPC 2.0 over HTTP"""
    try:
        body = request.get_json(force=True)
    except Exception:
        return jsonify({"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None}), 400

    msg_id = body.get("id", 0)
    method = body.get("method", "")
    params = body.get("params", {})

    if method == "tools/list":
        tools = []
        for name, t in ALL_TOOLS.items():
            tools.append({
                "name": name,
                "description": t["description"],
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                }
            })
        return jsonify({
            "jsonrpc": "2.0",
            "id": msg_id,
            "result": {"tools": tools}
        })

    elif method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})

        if tool_name not in ALL_TOOLS:
            return jsonify({
                "jsonrpc": "2.0", "id": msg_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
            })

        try:
            start = time.time()
            result_text = ALL_TOOLS[tool_name]["handler"](tool_args)
            elapsed = (time.time() - start) * 1000
            log.info(f"{tool_name} -> {elapsed:.0f}ms")

            return jsonify({
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": result_text}]
                }
            })
        except Exception as e:
            log.error(f"{tool_name} failed: {e}")
            return jsonify({
                "jsonrpc": "2.0", "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": f"[{tool_name}] ????: {str(e)}"}]
                }
            })

    else:
        return jsonify({
            "jsonrpc": "2.0", "id": msg_id,
            "error": {"code": -32601, "message": f"Unknown method: {method}"}
        })

@app.route("/health")
def health():
    return jsonify({"status": "ok", "tools": len(ALL_TOOLS)})


# ??? Startup ???

# ??? REST endpoints (for frontend charts ? delegating to Bridge functions) ???

@app.route("/kline")
def rest_kline():
    code = request.args.get("code", "").strip()
    count = min(int(request.args.get("count", 60)), 365)
    if len(code) != 6: return jsonify({"error": "invalid code"}), 400
    from ths_bridge_v3 import _fetch_kline_source
    data, src = _fetch_kline_source(code, count)
    return jsonify({"code": code, "count": count, "source": src, "data": data})

@app.route("/minute")
def rest_minute():
    code = request.args.get("code", "").strip()
    if len(code) != 6: return jsonify({"error": "invalid code"}), 400
    from ths_bridge_v3 import _fetch_minute_source
    data, src = _fetch_minute_source(code)
    return jsonify({"code": code, "source": src, "data": data})

@app.route("/market/overview")
def rest_market_overview():
    from ths_bridge_v3 import _market_overview, _get_effective_date, _is_trading_day, _pg_exec, HAS_PG
    data = _market_overview()
    dt = _get_effective_date()
    data["tradeDate"] = dt
    data["isTradingDay"] = _is_trading_day()
    # Fill up/down/flat from PG (accurate, works on non-trading days)
    if HAS_PG and dt:
        try:
            rows = _pg_exec(
                "SELECT count(*) FILTER (WHERE change_pct > 0) as up, "
                "count(*) FILTER (WHERE change_pct < 0) as down, "
                "count(*) FILTER (WHERE change_pct = 0) as flat "
                "FROM daily_kline WHERE trade_date=%s", (dt,))
            if rows:
                data["up"] = rows[0]["up"] or 0
                data["down"] = rows[0]["down"] or 0
                data["flat"] = rows[0]["flat"] or 0
                data["total"] = (rows[0]["up"] or 0) + (rows[0]["down"] or 0) + (rows[0]["flat"] or 0)
        except Exception as e:
            log.warning(f"market_overview PG fallback: {e}")
    return jsonify(data)

@app.route("/sector/ranking")
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
            return jsonify({"data": [dict(r) for r in rows], "tradeDate": dt, "source": "database"})
    return jsonify({"data": [], "source": "unavailable"})

@app.route("/concept/ranking")
def rest_concept_ranking():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT bc.concept_name as name, round(avg(dk.change_pct)::numeric,2) as change_pct, count(*) as stock_cnt "
            "FROM daily_kline dk LEFT JOIN base_stock_concepts bsc ON dk.code=bsc.code "
            "LEFT JOIN base_concepts bc ON bsc.concept_id=bc.concept_id "
            "WHERE dk.trade_date=%s AND bc.concept_name IS NOT NULL "
            "GROUP BY bc.concept_name ORDER BY change_pct DESC LIMIT 30", (dt,))
        if rows:
            return jsonify({"data": [dict(r) for r in rows], "tradeDate": dt, "source": "database"})
    return jsonify({"data": [], "source": "unavailable"})

@app.route("/fund/flow")
def rest_fund_flow():
    from ths_bridge_v3 import _em_fund_flow_market, _get_effective_date
    flow = _em_fund_flow_market()
    if flow: flow["tradeDate"] = _get_effective_date()
    return jsonify(flow or {"mainNetInflow": 0, "source": "unavailable"})

@app.route("/limit/stats")
def rest_limit_stats():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG, _is_trading_day
    dt = _get_effective_date()
    if HAS_PG and dt:
        rows = _pg_exec(
            "SELECT count(*) FILTER (WHERE change_pct>=9.8) as up, "
            "count(*) FILTER (WHERE change_pct<=-9.8) as down, "
            "count(*) FILTER (WHERE change_pct>=5 AND change_pct<9.8) as broken "
            "FROM daily_kline WHERE trade_date=%s", (dt,))
        if rows:
            return jsonify({
                "up": rows[0]["up"] or 0, "down": rows[0]["down"] or 0,
                "broken": rows[0]["broken"] or 0, "sealRate": 0,
                "tradeDate": dt, "isTradingDay": _is_trading_day(), "source": "database"
            })
    return jsonify({"up":0,"down":0,"broken":0,"sealRate":0,"source":"unavailable"})

@app.route("/limit/up")
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
            return jsonify({
                "data": [{k: (float(v) if k in ("change_pct","turnover_rate") else v) for k,v in dict(r).items()} for r in rows],
                "tradeDate": dt, "isTradingDay": _is_trading_day(), "source": "database"
            })
    return jsonify({"data":[],"source":"unavailable"})

@app.route("/limit/bigloser")
def rest_limit_bigloser():
    from ths_bridge_v3 import _get_effective_date, _last_trade_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    result = {"bigLosers": [], "nuclearButtons": [], "tradeDate": dt}
    if HAS_PG and dt:
        bl = _pg_exec("SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk LEFT JOIN base_stocks bs ON dk.code=bs.code WHERE dk.trade_date=%s AND dk.change_pct<=-10", (dt,))
        if bl: result["bigLosers"] = [{"code":r["code"],"name":r.get("name",""),"changePercent":float(r["change_pct"] or 0)} for r in bl]
        yest = _last_trade_date()
        if yest and yest != dt:
            nb = _pg_exec("SELECT dk.code, bs.name, dk.change_pct FROM daily_kline dk LEFT JOIN base_stocks bs ON dk.code=bs.code WHERE dk.trade_date=%s AND dk.change_pct<=-9.8 AND dk.code IN (SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if nb: result["nuclearButtons"] = [{"code":r["code"],"name":r.get("name",""),"changePercent":float(r["change_pct"] or 0)} for r in nb]
    return jsonify(result)

@app.route("/limit/yesterday-premium")
def rest_yesterday_premium():
    from ths_bridge_v3 import _get_effective_date, _pg_exec, HAS_PG
    dt = _get_effective_date()
    result = {"avgReturn": 0, "count": 0, "date": dt}
    if HAS_PG and dt:
        ye = _pg_exec("SELECT max(trade_date) FROM daily_kline WHERE trade_date<%s", (dt,))
        if ye:
            yest = str(ye[0]["max"])
            rows = _pg_exec("SELECT dk.change_pct FROM daily_kline dk WHERE dk.trade_date=%s AND dk.code IN (SELECT code FROM daily_limit_up WHERE trade_date=%s)", (dt, yest))
            if rows:
                rets = [float(r["change_pct"] or 0) for r in rows]
                result["avgReturn"] = round(sum(rets)/len(rets), 2) if rets else 0
                result["count"] = len(rets)
    return jsonify(result)

@app.route("/review/history")
def rest_review_history():
    from ths_bridge_v3 import _pg_exec, HAS_PG
    days = min(int(request.args.get("days", 20)), 60)
    result = {"days": []}
    if HAS_PG:
        rows = _pg_exec(
            "SELECT trade_date, count(*) FILTER (WHERE change_pct>=9.8) as up, "
            "count(*) FILTER (WHERE change_pct<=-9.8) as down, "
            "round(avg(change_pct)::numeric,2) as avg_pct, sum(amount) as amt "
            "FROM daily_kline WHERE trade_date>=(SELECT max(trade_date) FROM daily_kline)-INTERVAL '%s days' "
            "GROUP BY trade_date ORDER BY trade_date DESC LIMIT %s", (days*2, days))
        if rows:
            result["days"] = [{"date": str(r["trade_date"])[:10], "upCount": int(r["up"] or 0),
                "downCount": int(r["down"] or 0), "avgChange": float(r["avg_pct"] or 0),
                "totalAmount": float(r["amt"] or 0)} for r in rows]
    return jsonify(result)


if __name__ == "__main__":
    PORT = 8766
    print(f"""
  MCP Bridge v1.0
  ===============
  REST+ MCP: http://localhost:{PORT}/mcp
  Health:   http://localhost:{PORT}/health
  Tools:    {len(ALL_TOOLS)} available
    """)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
