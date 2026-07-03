/** 基础设施层 — 题材演化相关类型 */

/** 题材演化子项类型 */
export type EvoChildType = "leader" | "follower" | "diffusion";

/** 题材演化子项标签映射 */
export const EVO_CHILD_LABELS: Record<EvoChildType, string> = {
  leader: "龙头",
  follower: "跟风",
  diffusion: "扩散",
};

/** 演化节点中的个股信息 */
export interface EvoStock {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 最新价 */
  latest: number;
  /** 涨跌幅（百分比） */
  changeRate: number;
  /** 成交额 */
  tradingAmount: number;
  /** 连续涨停天数 */
  continueNum: number;
  /** 涨停形态描述（如"2天2板"） */
  highDays: string;
  /** 首次涨停时间戳 */
  firstLimitUpTime: string;
  /** 涨停类型（一字板/换手板） */
  limitUpType: string;
  /** 封单额 */
  orderAmount: number;
  /** 流通市值 */
  currencyValue: number;
  /** 换手率 */
  turnoverRate: number;
  /** 所属行业 */
  industry: string;
  /** 涨停原因类型 */
  reasonType: string;
  /** 涨停原因详情 */
  reasonInfo: string;
  /** 题材分类名 */
  categoryName: string;
  /** 题材分析 */
  categoryAnalysis: string;
  /** 涨停成功率 */
  limitUpSucRate: number;
  /** 是否再次涨停 */
  isAgainLimit: number;
  /** 变化标签 */
  changeTag: string;
  /** 主力净流入（若数据源有提供） */
  mainNetIn?: number;
  /** 竞价涨跌幅（若数据源有提供） */
  auctionChangePct?: number;
  /** 峰值封单额 */
  peakOrderAmount?: number;
  /** 首次涨停时间格式化 */
  firstLimitUpTimeFormatted?: string;
  /** 日内振幅 */
  intradayAmplitude?: number;
}

/** 题材演化子项（龙头/跟风/扩散） */
export interface ThemeEvoChild {
  type: EvoChildType;
  label: string;
  stockCount: number;
  /** 该子项下的个股列表 */
  stocks: EvoStock[];
}

/** 题材演化父级节点 */
export interface ThemeEvoNode {
  id: string;
  name: string;
  children: ThemeEvoChild[];
}

/** 发酵路径中的一个步骤节点 */
export interface EvoStepNode {
  id: string;
  label: string;
  theme: string;
  childType: EvoChildType;
  stockCount: number;
  /** 该步骤关联的个股 */
  stocks: EvoStock[];
}

/** 发酵路径中的连接线 */
export interface EvoFlowLink {
  source: string;
  target: string;
  value: number;
  label?: string;
}

/** 一条完整的发酵路径 */
export interface EvoPath {
  steps: EvoStepNode[];
  links: EvoFlowLink[];
}
