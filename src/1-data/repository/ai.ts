/**
 * AI Repository — DeepSeek 对话 + MCP工具调用 + 市场上下文
 * 数据源: quicktiny ladder + 同花顺 + MCP(Wudao Data)
 */
import { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL } from "@infra/config";
import type { NewsItem, KaipanlaItem } from "@infra/types/ai";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { callMCPTool, MCP_FUNCTIONS, type FunctionDef } from "@data/repository/mcp";
import { fetchFromBridgeTool } from "@data/repository/bridge";

// ─── 流式回调类型 ──────────────────────────────

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onReasoning: (token: string) => void;
  onFunctionCall: (call: { name: string; arguments: string }) => void;
  onDone: (finishReason?: string) => void;
  onError: (err: Error) => void;
}

// ─── DeepSeek 流式对话（含 function calling + reasoning） ──

export async function streamDeepSeekChat(
  messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  model = "deepseek-chat",
  functions?: FunctionDef[],
  options?: { temperature?: number }
): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: 4096,
    };

    // 附加 function calling
    if (functions && functions.length > 0) {
      body.tools = functions.map((f) => ({
        type: "function",
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        },
      }));
      body.tool_choice = "auto";
    }

    const resp = await fetch(DEEPSEEK_BASE_URL + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + DEEPSEEK_API_KEY,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!resp.ok) {
      const eb = await resp.text().catch(() => "");
      throw new Error("API " + resp.status + ": " + eb.slice(0, 200));
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No stream");

    const decoder = new TextDecoder();
    let buffer = "";
    // 累积 function_call 增量
    let fcName = "";
    let fcArgs = "";
    let fcIndex = -1;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string;
                reasoning_content?: string;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string;
            }>;
          };

          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // 思维链
          if (delta.reasoning_content) {
            callbacks.onReasoning(delta.reasoning_content);
          }

          // 文本内容
          if (delta.content) {
            callbacks.onToken(delta.content);
          }

          // 函数调用
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined && tc.index !== fcIndex) {
                // 新工具调用
                if (fcName) {
                  callbacks.onFunctionCall({ name: fcName, arguments: fcArgs });
                }
                fcIndex = tc.index;
                fcName = tc.function?.name ?? "";
                fcArgs = tc.function?.arguments ?? "";
              } else {
                if (tc.function?.name) fcName += tc.function.name;
                if (tc.function?.arguments) fcArgs += tc.function.arguments;
              }
            }
          }

          // 完成
          const finishReason = parsed.choices?.[0]?.finish_reason;
          if (finishReason) {
            // 如果有未完成的 function_call，发送
            if (fcName && (finishReason === "tool_calls" || finishReason === "stop")) {
              callbacks.onFunctionCall({ name: fcName, arguments: fcArgs });
            }
            callbacks.onDone(finishReason);
          }
        } catch { /* skip */ }
      }
    }

    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ─── MCP 工具执行 ──────────────────────────────

export async function executeToolCall(
  name: string,
  argsStr: string
): Promise<string> {
  try {
    const args = argsStr ? (JSON.parse(argsStr) as Record<string, unknown>) : {};
    // 1. Local MCP (port 8766) ? PG-backed, 100% accurate, no weekend issues
    try {
      const mcpResult = await callMCPTool(name, args);
      if (mcpResult && !mcpResult.startsWith("[") && !mcpResult.includes("unavailable")) {
        return mcpResult;
      }
    } catch { /* MCP unreachable, try Bridge */ }

    // 2. Bridge REST ? fallback for direct API access
    const bridgeResult = await fetchFromBridgeTool(name, args);
    if (bridgeResult !== null) return bridgeResult;

    return "[data] no data source available for " + name;
  } catch (err) {
    return "[tool call failed] " + (err instanceof Error ? err.message : String(err));
  }
}

export { MCP_FUNCTIONS };

// ─── 新闻/热榜 ──────────────────────────────────

// ─── 市场上下文（MCP工具预加载） ──────────────────

export async function fetchBoardLadderForContext(): Promise<string> {
  try {
    const results = await Promise.allSettled([
      callMCPTool("market_overview", {}),
      callMCPTool("limit_stats", {}),
      callMCPTool("limit_up_ladder", {}),
    ]);
    const parts: string[] = [];
    if (results[0].status === "fulfilled" && results[0].value) parts.push(results[0].value);
    if (results[1].status === "fulfilled" && results[1].value) parts.push(results[1].value);
    if (results[2].status === "fulfilled" && results[2].value) parts.push(results[2].value);
    return parts.join("\n\n");
  } catch {
    return "";
  }
}

export async function fetchCailianNews(): Promise<NewsItem[]> {
  try { const r = await fetch("https://stock.quicktiny.cn/api/cailian-telegraph"); if (!r.ok) return []; const j = await r.json() as { error: number; data: NewsItem[] }; return j.data ?? []; } catch { return []; }
}
export async function fetchKaipanla(): Promise<KaipanlaItem[]> {
  try { const r = await fetch("https://stock.quicktiny.cn/api/hotlist/kaipanla"); if (!r.ok) return []; const j = await r.json() as { success: boolean; data: KaipanlaItem[] }; return j.data ?? []; } catch { return []; }
}

// ─── 同花顺 大盘指数 ──────────────────────────