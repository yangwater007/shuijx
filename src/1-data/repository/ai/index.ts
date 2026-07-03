/** 数据层 — AI 分析 Repository（DeepSeek API） */

import axios from "axios";
import type { ChatMessage, DeepSeekResponse } from "@data/dto/ai";

/** DeepSeek API 配置 */
const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const DEEPSEEK_KEY = "sk-096d707e86e24dc19a070650c6c0f6cc";
const MODEL = "deepseek-chat";

/** DeepSeek HTTP 客户端 */
const deepseekClient = axios.create({
  baseURL: DEEPSEEK_BASE,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DEEPSEEK_KEY}`,
  },
});

/** AI 分析数据仓库 */
class AIRepository {
  /**
   * 发送对话请求到 DeepSeek
   * @param messages 历史消息列表
   * @returns 助手回复内容
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await deepseekClient.post<DeepSeekResponse>(
      "/chat/completions",
      {
        model: MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI 未返回有效回复");
    }
    return content;
  }
}

const aiRepository = new AIRepository();
export default aiRepository;
export { AIRepository };
