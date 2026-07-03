/** 数据层 — AI 分析 DTO 类型 */

/** 对话消息 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

/** DeepSeek API 请求 */
export interface DeepSeekRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

/** DeepSeek API 响应 choice */
interface DeepSeekChoice {
  message: { role: string; content: string };
  finish_reason: string;
}

/** DeepSeek API 响应 */
export interface DeepSeekResponse {
  choices: DeepSeekChoice[];
}

/** AI 分析上下文 */
export interface AnalysisContext {
  stockCode?: string;
  stockName?: string;
  topic?: string;
}
