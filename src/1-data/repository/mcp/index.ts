/** 数据层 — Wudao Data MCP 客户端
 * 封装 SSE Stream 协议，提供类型安全的工具调用
 */

import { MCP_BASE_URL, WUDAO_API_KEY } from "@infra/config";

// ─── JSON-RPC 类型 ──────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  id: number;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ─── MCP 工具类型 ──────────────────────────────

/** MCP 工具参数属性 */
export interface MCPToolProperty {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  items?: { type: string };
}

/** MCP 工具定义 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, MCPToolProperty>;
    required?: string[];
  };
}

/** 工具调用参数 */
export type MCPCallArgs = Record<string, unknown>;

/** 工具调用结果 */
export interface MCPCallResult {
  tool: string;
  content: string;
  data?: unknown;
}

// ─── SSE 响应解析 ──────────────────────────────

/** 解析 SSE 文本为 JSON 对象 */
function parseSSEResponse(text: string): JsonRpcResponse | null {
  const match = text.match(/data:\s*(\{[\s\S]*\})/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]!) as JsonRpcResponse;
  } catch {
    return null;
  }
}

/** 发送 MCP 请求并获取响应 */
async function mcpRequest(method: string, params?: unknown): Promise<JsonRpcResponse> {
  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  };

  const resp = await fetch(MCP_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WUDAO_API_KEY}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`MCP 请求失败: ${resp.status ?? "unknown"}`);
  }

  const text = await resp.text();
  const parsed = parseSSEResponse(text);
  if (!parsed) {
    throw new Error("MCP 响应解析失败");
  }
  if (parsed.error) {
    throw new Error(`MCP 错误: ${parsed.error.message}`);
  }
  return parsed;
}

// ─── 公开 API ─────────────────────────────────

/** 工具列表缓存 */
let cachedTools: MCPTool[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

/** 获取所有可用工具列表 */
export async function listMCPTools(): Promise<MCPTool[]> {
  const now = Date.now();
  if (cachedTools && now - cacheTime < CACHE_TTL) {
    return cachedTools;
  }

  const resp = await mcpRequest("tools/list");
  const tools = (resp.result as { tools: MCPTool[] }).tools;
  cachedTools = tools;
  cacheTime = now;
  return tools;
}

/** 调用 MCP 工具 */
export async function callMCPTool(
  toolName: string,
  args: MCPCallArgs
): Promise<MCPCallResult> {
  const resp = await mcpRequest("tools/call", {
    name: toolName,
    arguments: args,
  });

  const result = resp.result as {
    content?: Array<{ type: string; text?: string }>;
    structuredContent?: unknown;
  };

  // 提取文本内容
  let content = "";
  if (result.content) {
    for (const item of result.content) {
      if (item.type === "text" && item.text) {
        content += item.text + "\n";
      }
    }
  }

  return {
    tool: toolName,
    content: content.trim(),
    data: result.structuredContent ?? result,
  };
}

/** 获取 DeepSeek 可用的 Function Calling 工具定义 */
export async function getDeepSeekToolDefinitions(): Promise<
  Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
      };
    };
  }>
> {
  const tools = await listMCPTools();
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description.slice(0, 1024), // DeepSeek 限制
      parameters: {
        type: "object" as const,
        properties: t.inputSchema.properties as Record<string, unknown>,
        required: t.inputSchema.required,
      },
    },
  }));
}