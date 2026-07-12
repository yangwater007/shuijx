/** 基础设施层 — 全局配置常量 */

/** 后端 API 地址 */
export const API_BASE_URL = "https://stock.quicktiny.cn/api";

/** DeepSeek API 配置 */
export const DEEPSEEK_API_KEY = "sk-096d707e86e24dc19a070650c6c0f6cc";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEEPSEEK_CHAT_MODEL = "deepseek-chat";

/** 东方财富 K线 API 路径（dev: Vite代理, prod: 需服务端代理） */
/** 东方财富 分时 API 路径 */
/** 东方财富 CORS 安全 Referer */
/** 同花顺 K线 API 基础路径 */
// ???? K? API (HTTPS + CORS *, ????????/??)
export const TENCENT_KL_API = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get";
// ???? ?? API
export const TENCENT_MINUTE_API = "https://ifzq.gtimg.cn/appstock/app/minute/query";
// ???? ???? API
export const TENCENT_QUOTE_API = "https://qt.gtimg.cn/q";

export const TONGHUASHUN_KL_BASE = "https://d.10jqka.com.cn/v2/line";

/** 同花顺 分时 API 基础路径 */
export const TONGHUASHUN_TS_BASE = "https://d.10jqka.com.cn/v2/time";

/** 同花顺 K线周期映射 */

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

// AI analysis: REST API data injection
/** Wudao Data MCP 配置 */
export const WUDAO_API_KEY = "lb_3013ad2ba0aca0c769b34eab2192f52d50809313c02a1a7db787a7980ecff112";
export const MCP_BASE_URL = "https://stock.quicktiny.cn/api/mcp-stream";
