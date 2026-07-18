/** 基础基础设施层 — 全局配置常量 */

/** 后端 API 地址 */
export const API_BASE_URL = "https://stock.quicktiny.cn/api";

/** DeepSeek API 配置 */
export const DEEPSEEK_API_KEY = typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_DEEPSEEK_API_KEY ?? "" : "";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEEPSEEK_CHAT_MODEL = "deepseek-chat";

/** 腾讯 K线 API */
export const TENCENT_KL_API = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get";
/** 腾讯 分时 API */
export const TENCENT_MINUTE_API = "https://ifzq.gtimg.cn/appstock/app/minute/query";
/** 腾讯 报价 API */
export const TENCENT_QUOTE_API = "https://qt.gtimg.cn/q";

/** 同花顺 K线 API */
export const TONGHUASHUN_KL_BASE = "https://d.10jqka.com.cn/v2/line";
/** 同花顺 分时 API */
export const TONGHUASHUN_TS_BASE = "https://d.10jqka.com.cn/v2/time";

/** 桥服务地址
 *  - 本地: http://localhost:8765
 *  - ngrok隧道: 设置环境变量 VITE_BRIDGE_URL 或运行时URL参数 ?bridge=xxx
 *  - 也可以在浏览器控制台设置: localStorage.bridgeUrl = "https://xxx.ngrok-free.app"
 */
export function getBridgeUrl(): string {
  // 1. URL 参数 ?bridge=xxx（优先级最高）
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get("bridge");
    if (urlParam) return urlParam;
    // 2. localStorage
    const stored = localStorage.getItem("bridgeUrl");
    if (stored) return stored;
  }
  // 3. 环境变量（Vite）
  // @ts-ignore
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_BRIDGE_URL) {
    // @ts-ignore
    return import.meta.env.VITE_BRIDGE_URL;
  }
  // 4. 默认本地
  return "http://localhost:8765";
}

/** 获取当前桥地址 */
/**
 * ???? MCP Bridge ?? (DeepSeek function calling ?)
 * ??: localStorage.mcpBridgeUrl ? URL?? ?mcp=xxx ? Bridge URL/mcp ? localhost:8766
 */
export function getMCPUrl(): string {
  try {
    const stored = localStorage.getItem("mcpBridgeUrl");
    if (stored) return stored;
  } catch {}
  try {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const mcpParam = params.get("mcp");
    if (mcpParam) return mcpParam;
  } catch {}
  // @ts-ignore
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_MCP_URL) {
    // @ts-ignore
    return import.meta.env.VITE_MCP_URL;
  }
  // Fallback: use bridge URL + /mcp if it looks like a tunnel
  const bridge = getBridgeUrl();
  if (bridge && !bridge.includes("localhost") && !bridge.includes("127.0.0.1")) {
    return bridge.replace(/\/+$/, "") + "/mcp";
  }
  return "http://localhost:8766/mcp";
}

export const LOCAL_BRIDGE_URL = typeof window !== "undefined"
  ? getBridgeUrl()
  : "http://localhost:8765";

/** 股票涨跌颜色 */
export const STOCK_UP = "#ef4444";
export const STOCK_DOWN = "#22c55e";
export const STOCK_FLAT = "#6b7280";

/** 界面背景色 */
export const BOARD_BG = "#0f172a";
export const BOARD_CARD = "#1e293b";
export const BOARD_BORDER = "#334155";

/** 连板天梯最大显示层级 */
export const MAX_BOARD_LEVEL = 15;

/** Wudao Data MCP 配置 */
export const WUDAO_API_KEY = typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_WUDAO_API_KEY ?? "" : "";
export const MCP_BASE_URL = "https://stock.quicktiny.cn/api/mcp-stream";
