/** 基础设施层 — AI对话相关类型 */

/** 聊天消息角色 */
export type ChatRole = "user" | "assistant" | "system" | "tool";

/** 聊天消息 */

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
  isInterrupted?: boolean;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  toolCallId?: string;
  toolName?: string;
  isToolRunning?: boolean;
  timestamp: number;
}

/** DeepSeek 模型 */
export type AIModel = "deepseek-chat" | "deepseek-reasoner";

/** 模型配置 */
export const AI_MODELS: { key: AIModel; label: string; description: string }[] = [
  { key: "deepseek-chat", label: "DeepSeek-V3", description: "快速对话，适合通用分析" },
  { key: "deepseek-reasoner", label: "DeepSeek-R1", description: "深度推理，适合复杂复盘" },
];

/** 分析框架（用户自定义交易策略） */
export interface AnalysisFramework {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
  isBuiltIn: boolean;
}

/** 预置分析框架 */
export const BUILTIN_FRAMEWORKS: AnalysisFramework[] = [
  {
    id: "limit-up-review",
    name: "涨停复盘",
    description: "分析涨停股票的模式、题材和可持续性",
    prompt: "请对今日涨停股票进行系统复盘：1) 最高板分析 2) 主线题材梳理 3) 首板挖掘 4) 风险提示",
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: "sector-rotation",
    name: "板块轮动",
    description: "分析板块资金流向和轮动节奏",
    prompt: "请分析当前板块轮动特征：1) 领涨板块及持续性 2) 资金流入方向 3) 高低切换信号 4) 后市预判",
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: "sentiment",
    name: "市场情绪",
    description: "评估市场情绪和赚钱效应",
    prompt: "请评估当前市场情绪：1) 涨停家数与炸板率 2) 连板高度与梯队 3) 成交量变化 4) 情绪周期判断",
    enabled: false,
    isBuiltIn: true,
  },
  {
    id: "news-digest",
    name: "新闻解读",
    description: "解读财联社电报和重要公告",
    prompt: "请解读以下财经新闻对市场的影响：1) 重大政策信号 2) 行业动态 3) 个股公告解读 4) 市场预期变化",
    enabled: false,
    isBuiltIn: true,
  },
];

/** 新闻条目（财联社电报） */
export interface NewsItem {
  id: number;
  title: string;
  content: string;
  brief: string;
  ctime: number;
  level: string;
  readingNum: number;
  type: number;
}

/** 开盘啦热榜 */
export interface KaipanlaItem {
  code: string;
  name: string;
  hotRank: number;
  rank: number;
  rankChange: number;
  value: number;
  changePercent: number;
  conceptTags: string[];
  tags: string[];
  analyse: string;
  analyseTitle: string;
}

/** 聊天会话 */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
