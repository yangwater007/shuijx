
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

if __name__ == "__main__":
    PORT = 8766
    print(f"""
  MCP Bridge v1.0
  ===============
  Endpoint: http://localhost:{PORT}/mcp
  Health:   http://localhost:{PORT}/health
  Tools:    {len(ALL_TOOLS)} available
    """)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
