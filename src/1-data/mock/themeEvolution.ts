/** 数据层 — 题材演化 Mock 数据 + Raw→Domain 转换 */

import type { ThemeEvoNode, EvoPath, EvoStock } from "@infra/types/themeEvolution";
import type { ThemeEvolutionData, RawThemeEvolutionResponse } from "@data/dto/themeEvolution";
import { mapRawEvoStock } from "@data/dto/themeEvolution";
import { EVO_CHILD_LABELS } from "@infra/types/themeEvolution";

// ─── Mock 个股数据 ─────────────────────────────

const STOCK_001: EvoStock = {
  code: "002961", name: "瑞达期货", latest: 29.38, changeRate: 9.996,
  tradingAmount: 198540020, continueNum: 2, highDays: "2天2板",
  firstLimitUpTime: "1765157100", limitUpType: "一字板",
  orderAmount: 114562639, currencyValue: 13075107400, turnoverRate: 1.5185,
  industry: "多元金融", reasonType: "海峡两岸+期货+资管",
  reasonInfo: "公司注册地及办公地位于福建省厦门市，为福建省规模最大、盈利能力最强的期货公司。",
  categoryName: "福建", categoryAnalysis: "期货(福建)+香港金融牌照+互联网金融",
  limitUpSucRate: 1, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_002: EvoStock = {
  code: "603316", name: "诚邦股份", latest: 15.28, changeRate: 10.01,
  tradingAmount: 85600000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765159879", limitUpType: "换手板",
  orderAmount: 52000000, currencyValue: 4200000000, turnoverRate: 8.5,
  industry: "建筑工程", reasonType: "存储芯片+建筑工程",
  reasonInfo: "公司近期切入存储芯片领域，布局先进封装检测业务。",
  categoryName: "存储芯片", categoryAnalysis: "存储芯片+先进封装+建筑转型",
  limitUpSucRate: 0.8, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_003: EvoStock = {
  code: "000592", name: "平潭发展", latest: 6.85, changeRate: 10.03,
  tradingAmount: 125600000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765100000", limitUpType: "换手板",
  orderAmount: 38600000, currencyValue: 8900000000, turnoverRate: 6.2,
  industry: "综合", reasonType: "福建+海西",
  reasonInfo: "公司地处福建省平潭综合实验区，受益于海峡两岸政策利好。",
  categoryName: "福建", categoryAnalysis: "福建+海西+土地开发",
  limitUpSucRate: 0.7, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_004: EvoStock = {
  code: "300293", name: "蓝英装备", latest: 22.36, changeRate: 20.02,
  tradingAmount: 458000000, continueNum: 3, highDays: "3天3板",
  firstLimitUpTime: "1765000000", limitUpType: "一字板",
  orderAmount: 156000000, currencyValue: 10500000000, turnoverRate: 18.5,
  industry: "专用设备", reasonType: "机器人+智能制造",
  reasonInfo: "公司精密清洗设备在机器人制造领域得到广泛应用。",
  categoryName: "机器人", categoryAnalysis: "机器人+智能制造+工业4.0",
  limitUpSucRate: 1, isAgainLimit: 0, changeTag: "CONTINUE_LIMIT",
};

const STOCK_005: EvoStock = {
  code: "002527", name: "新时达", latest: 15.8, changeRate: 9.99,
  tradingAmount: 689000000, continueNum: 2, highDays: "2天2板",
  firstLimitUpTime: "1765050000", limitUpType: "换手板",
  orderAmount: 89000000, currencyValue: 18300000000, turnoverRate: 11.3,
  industry: "电气设备", reasonType: "机器人+新能源汽车",
  reasonInfo: "公司机器人业务持续增长，新能源汽车电机控制器放量。",
  categoryName: "机器人", categoryAnalysis: "机器人+新能源+工控",
  limitUpSucRate: 0.9, isAgainLimit: 0, changeTag: "CONTINUE_LIMIT",
};

const STOCK_006: EvoStock = {
  code: "603666", name: "亿嘉和", latest: 38.5, changeRate: 10.0,
  tradingAmount: 325000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1764900000", limitUpType: "换手板",
  orderAmount: 62000000, currencyValue: 12800000000, turnoverRate: 7.8,
  industry: "机器人", reasonType: "机器人+特种作业",
  reasonInfo: "公司专注特种机器人领域，近期获大额电力巡检订单。",
  categoryName: "机器人", categoryAnalysis: "特种机器人+巡检+电力",
  limitUpSucRate: 0.75, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_007: EvoStock = {
  code: "688256", name: "寒武纪", latest: 385.0, changeRate: 10.5,
  tradingAmount: 6800000000, continueNum: 2, highDays: "2天2板",
  firstLimitUpTime: "1765000000", limitUpType: "换手板",
  orderAmount: 520000000, currencyValue: 168000000000, turnoverRate: 12.1,
  industry: "半导体", reasonType: "AI芯片+算力",
  reasonInfo: "国产AI推理芯片龙头，新品性能大幅提升，获多家大厂订单。",
  categoryName: "AI硬件", categoryAnalysis: "AI芯片+国产替代+算力",
  limitUpSucRate: 1, isAgainLimit: 0, changeTag: "CONTINUE_LIMIT",
};

const STOCK_008: EvoStock = {
  code: "002230", name: "科大讯飞", latest: 68.2, changeRate: 8.5,
  tradingAmount: 4200000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765100000", limitUpType: "换手板",
  orderAmount: 180000000, currencyValue: 158000000000, turnoverRate: 6.5,
  industry: "软件服务", reasonType: "AI软件+大模型",
  reasonInfo: "星火大模型4.0发布，模型能力对标GPT-4水平。",
  categoryName: "AI硬件", categoryAnalysis: "大模型+AI应用+教育",
  limitUpSucRate: 0.85, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_009: EvoStock = {
  code: "603019", name: "中科曙光", latest: 72.5, changeRate: 7.8,
  tradingAmount: 3200000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765080000", limitUpType: "换手板",
  orderAmount: 210000000, currencyValue: 112000000000, turnoverRate: 5.2,
  industry: "计算机", reasonType: "算力+信创",
  reasonInfo: "国产算力服务器龙头，深度参与国家超算中心建设。",
  categoryName: "AI硬件", categoryAnalysis: "算力+信创+服务器",
  limitUpSucRate: 0.9, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_010: EvoStock = {
  code: "688981", name: "中芯国际", latest: 68.3, changeRate: 12.5,
  tradingAmount: 8500000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765050000", limitUpType: "换手板",
  orderAmount: 680000000, currencyValue: 235000000000, turnoverRate: 8.6,
  industry: "半导体", reasonType: "芯片制造+国产替代",
  reasonInfo: "先进制程良率持续提升，14nm实现规模量产。",
  categoryName: "半导体", categoryAnalysis: "晶圆代工+先进制程+国产替代",
  limitUpSucRate: 0.95, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_011: EvoStock = {
  code: "002049", name: "紫光国微", latest: 156.8, changeRate: 9.8,
  tradingAmount: 1800000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765060000", limitUpType: "换手板",
  orderAmount: 95000000, currencyValue: 78000000000, turnoverRate: 6.3,
  industry: "半导体", reasonType: "FPGA+特种芯片",
  reasonInfo: "FPGA芯片在5G基站和特种领域需求旺盛。",
  categoryName: "半导体", categoryAnalysis: "FPGA+特种芯片+5G",
  limitUpSucRate: 0.88, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_012: EvoStock = {
  code: "300502", name: "新易盛", latest: 105.6, changeRate: 15.2,
  tradingAmount: 2800000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765100000", limitUpType: "换手板",
  orderAmount: 230000000, currencyValue: 45000000000, turnoverRate: 14.8,
  industry: "通信设备", reasonType: "光模块+CPO",
  reasonInfo: "800G光模块批量出货，1.6T送样测试通过。",
  categoryName: "光通信", categoryAnalysis: "光模块+CPO+800G",
  limitUpSucRate: 0.92, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_013: EvoStock = {
  code: "300308", name: "中际旭创", latest: 185.0, changeRate: 13.6,
  tradingAmount: 5200000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765090000", limitUpType: "换手板",
  orderAmount: 420000000, currencyValue: 82000000000, turnoverRate: 11.2,
  industry: "通信设备", reasonType: "光模块龙头",
  reasonInfo: "全球光模块市占率第一，800G/1.6T光模块领先量产。",
  categoryName: "光通信", categoryAnalysis: "光模块+全球龙头+800G",
  limitUpSucRate: 0.95, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_014: EvoStock = {
  code: "688008", name: "澜起科技", latest: 82.5, changeRate: 11.2,
  tradingAmount: 1600000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765070000", limitUpType: "换手板",
  orderAmount: 78000000, currencyValue: 36000000000, turnoverRate: 9.5,
  industry: "半导体", reasonType: "DDR5+接口芯片",
  reasonInfo: "DDR5内存接口芯片全球领先，受益于AI服务器需求爆发。",
  categoryName: "存储", categoryAnalysis: "DDR5+接口芯片+服务器",
  limitUpSucRate: 0.9, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_015: EvoStock = {
  code: "002463", name: "沪电股份", latest: 42.3, changeRate: 8.9,
  tradingAmount: 950000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765080000", limitUpType: "换手板",
  orderAmount: 45000000, currencyValue: 42000000000, turnoverRate: 5.8,
  industry: "电子", reasonType: "PCB+AI服务器",
  reasonInfo: "高端PCB受益于AI服务器和交换机需求爆发。",
  categoryName: "AI硬件", categoryAnalysis: "PCB+AI服务器+交换机",
  limitUpSucRate: 0.85, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_016: EvoStock = {
  code: "600519", name: "贵州茅台", latest: 1680.0, changeRate: 5.6,
  tradingAmount: 8500000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765100000", limitUpType: "换手板",
  orderAmount: 1200000000, currencyValue: 2130000000000, turnoverRate: 1.2,
  industry: "酿酒", reasonType: "消费龙头+提价",
  reasonInfo: "茅台酒出厂价上调，终端动销情况良好。",
  categoryName: "大消费", categoryAnalysis: "白酒龙头+提价+消费复苏",
  limitUpSucRate: 0.98, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_017: EvoStock = {
  code: "000858", name: "五粮液", latest: 186.5, changeRate: 6.8,
  tradingAmount: 3200000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765105000", limitUpType: "换手板",
  orderAmount: 280000000, currencyValue: 720000000000, turnoverRate: 2.1,
  industry: "酿酒", reasonType: "消费+白酒",
  reasonInfo: "春节旺季动销超预期，经销商库存处于低位。",
  categoryName: "大消费", categoryAnalysis: "白酒+消费升级+旺季",
  limitUpSucRate: 0.9, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_018: EvoStock = {
  code: "300750", name: "宁德时代", latest: 256.0, changeRate: 12.0,
  tradingAmount: 7800000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765060000", limitUpType: "换手板",
  orderAmount: 560000000, currencyValue: 1200000000000, turnoverRate: 4.5,
  industry: "电气设备", reasonType: "锂电池龙头+储能",
  reasonInfo: "麒麟电池大批量交付，储能业务高速增长。",
  categoryName: "锂电池", categoryAnalysis: "动力电池+储能+钠离子",
  limitUpSucRate: 0.95, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_019: EvoStock = {
  code: "002466", name: "天齐锂业", latest: 56.8, changeRate: 8.2,
  tradingAmount: 1800000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765070000", limitUpType: "换手板",
  orderAmount: 120000000, currencyValue: 68000000000, turnoverRate: 5.6,
  industry: "有色", reasonType: "锂矿+涨价",
  reasonInfo: "碳酸锂价格触底反弹，公司格林布什矿产能利用率提升。",
  categoryName: "锂电池", categoryAnalysis: "锂矿+碳酸锂+资源为王",
  limitUpSucRate: 0.85, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_020: EvoStock = {
  code: "600276", name: "恒瑞医药", latest: 52.3, changeRate: 7.5,
  tradingAmount: 1200000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765090000", limitUpType: "换手板",
  orderAmount: 86000000, currencyValue: 280000000000, turnoverRate: 2.8,
  industry: "医药", reasonType: "创新药+出海",
  reasonInfo: "多款创新药获FDA批准上市，海外收入持续增长。",
  categoryName: "医药", categoryAnalysis: "创新药+国际化+管线丰富",
  limitUpSucRate: 0.9, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_021: EvoStock = {
  code: "300760", name: "迈瑞医疗", latest: 328.0, changeRate: 6.3,
  tradingAmount: 1600000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765080000", limitUpType: "换手板",
  orderAmount: 98000000, currencyValue: 390000000000, turnoverRate: 1.8,
  industry: "医疗保健", reasonType: "医疗器械+出海",
  reasonInfo: "监护仪和超声设备全球市占率持续提升。",
  categoryName: "医疗医药", categoryAnalysis: "器械龙头+全球化+超声",
  limitUpSucRate: 0.95, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_022: EvoStock = {
  code: "600118", name: "中国卫星", latest: 38.6, changeRate: 10.02,
  tradingAmount: 680000000, continueNum: 2, highDays: "2天2板",
  firstLimitUpTime: "1765000000", limitUpType: "一字板",
  orderAmount: 52000000, currencyValue: 32000000000, turnoverRate: 4.2,
  industry: "航天航空", reasonType: "卫星+商业航天",
  reasonInfo: "星网计划加速推进，低轨卫星发射进入密集期。",
  categoryName: "商业航天", categoryAnalysis: "卫星+星网+低轨",
  limitUpSucRate: 1, isAgainLimit: 0, changeTag: "CONTINUE_LIMIT",
};

const STOCK_023: EvoStock = {
  code: "600877", name: "声光电科", latest: 25.3, changeRate: 9.98,
  tradingAmount: 420000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765060000", limitUpType: "换手板",
  orderAmount: 35000000, currencyValue: 18000000000, turnoverRate: 5.8,
  industry: "电子", reasonType: "商业航天+电子",
  reasonInfo: "航天电子元器件核心供应商，卫星载荷需求爆发。",
  categoryName: "商业航天", categoryAnalysis: "航天电子+元器件+卫星",
  limitUpSucRate: 0.8, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_024: EvoStock = {
  code: "601611", name: "中国核建", latest: 9.85, changeRate: 10.06,
  tradingAmount: 560000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765050000", limitUpType: "一字板",
  orderAmount: 48000000, currencyValue: 26000000000, turnoverRate: 3.5,
  industry: "建筑", reasonType: "核聚变+工程建设",
  reasonInfo: "公司参与多项核聚变实验装置建设项目。",
  categoryName: "可控核聚变", categoryAnalysis: "核聚变+工程建设+能源",
  limitUpSucRate: 0.9, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

const STOCK_025: EvoStock = {
  code: "300471", name: "厚普股份", latest: 18.6, changeRate: 12.5,
  tradingAmount: 350000000, continueNum: 1, highDays: "首板",
  firstLimitUpTime: "1765070000", limitUpType: "换手板",
  orderAmount: 28000000, currencyValue: 12000000000, turnoverRate: 6.8,
  industry: "专用设备", reasonType: "氢能源+核聚变",
  reasonInfo: "氢能设备和核聚变辅助设备双重受益。",
  categoryName: "可控核聚变", categoryAnalysis: "氢能+核聚变+清洁能源",
  limitUpSucRate: 0.75, isAgainLimit: 0, changeTag: "FIRST_LIMIT",
};

// ─── 题材演化节点树 ─────────────────────────────

/** 预生成步骤节点ID */
function nodeId(themeId: string, childType: string): string {
  return `${childType}_${themeId}`;
}

/** 创建子项 */
function makeChild(
  type: "leader" | "follower" | "diffusion",
  stockCount: number,
  stocks: EvoStock[]
) {
  return { type, label: EVO_CHILD_LABELS[type], stockCount, stocks };
}

export const MOCK_THEME_EVO_NODES: ThemeEvoNode[] = [
  {
    id: "半导体", name: "半导体", children: [
      makeChild("leader", 2, [STOCK_010, STOCK_011]),
      makeChild("follower", 5, [STOCK_014, STOCK_007, STOCK_015, STOCK_002, STOCK_006]),
      makeChild("diffusion", 8, [STOCK_009, STOCK_012, STOCK_013, STOCK_005, STOCK_004, STOCK_008, STOCK_020, STOCK_001]),
    ],
  },
  {
    id: "存储", name: "存储", children: [
      makeChild("leader", 2, [STOCK_014, STOCK_002]),
      makeChild("follower", 4, [STOCK_010, STOCK_011, STOCK_015, STOCK_007]),
      makeChild("diffusion", 6, [STOCK_009, STOCK_012, STOCK_013, STOCK_008, STOCK_005, STOCK_006]),
    ],
  },
  {
    id: "AI硬件", name: "AI硬件", children: [
      makeChild("leader", 3, [STOCK_007, STOCK_008, STOCK_009]),
      makeChild("follower", 6, [STOCK_015, STOCK_012, STOCK_013, STOCK_010, STOCK_011, STOCK_005]),
      makeChild("diffusion", 10, [STOCK_014, STOCK_004, STOCK_006, STOCK_002, STOCK_001, STOCK_003, STOCK_018, STOCK_022, STOCK_023, STOCK_020]),
    ],
  },
  {
    id: "医疗医药", name: "医疗医药", children: [
      makeChild("leader", 2, [STOCK_021, STOCK_020]),
      makeChild("follower", 4, [STOCK_016, STOCK_017, STOCK_019, STOCK_001]),
      makeChild("diffusion", 6, [STOCK_018, STOCK_015, STOCK_004, STOCK_006, STOCK_002, STOCK_003]),
    ],
  },
  {
    id: "其他", name: "其他", children: [
      makeChild("leader", 2, [STOCK_001, STOCK_025]),
      makeChild("follower", 3, [STOCK_024, STOCK_023, STOCK_003]),
      makeChild("diffusion", 4, [STOCK_022, STOCK_002, STOCK_006, STOCK_005]),
    ],
  },
  {
    id: "大消费", name: "大消费", children: [
      makeChild("leader", 2, [STOCK_016, STOCK_017]),
      makeChild("follower", 5, [STOCK_020, STOCK_021, STOCK_018, STOCK_019, STOCK_004]),
      makeChild("diffusion", 6, [STOCK_015, STOCK_010, STOCK_012, STOCK_005, STOCK_001, STOCK_006]),
    ],
  },
  {
    id: "医药", name: "医药", children: [
      makeChild("leader", 2, [STOCK_020, STOCK_021]),
      makeChild("follower", 3, [STOCK_016, STOCK_017, STOCK_018]),
    ],
  },
  {
    id: "可控核聚变", name: "可控核聚变", children: [
      makeChild("leader", 1, [STOCK_024]),
      makeChild("follower", 2, [STOCK_025, STOCK_018]),
    ],
  },
  {
    id: "商业航天", name: "商业航天", children: [
      makeChild("leader", 2, [STOCK_022, STOCK_023]),
      makeChild("follower", 3, [STOCK_024, STOCK_004, STOCK_009]),
    ],
  },
  {
    id: "机器人", name: "机器人", children: [
      makeChild("leader", 3, [STOCK_004, STOCK_005, STOCK_006]),
      makeChild("follower", 5, [STOCK_007, STOCK_009, STOCK_015, STOCK_019, STOCK_012]),
      makeChild("diffusion", 8, [STOCK_018, STOCK_013, STOCK_011, STOCK_008, STOCK_001, STOCK_002, STOCK_003, STOCK_025]),
    ],
  },
  {
    id: "算力", name: "算力", children: [
      makeChild("leader", 2, [STOCK_009, STOCK_007]),
      makeChild("follower", 4, [STOCK_015, STOCK_012, STOCK_013, STOCK_008]),
      makeChild("diffusion", 6, [STOCK_010, STOCK_011, STOCK_014, STOCK_005, STOCK_006, STOCK_004]),
    ],
  },
  {
    id: "公告", name: "公告", children: [
      makeChild("leader", 1, [STOCK_025]),
      makeChild("follower", 2, [STOCK_024, STOCK_001]),
      makeChild("diffusion", 3, [STOCK_002, STOCK_003, STOCK_006]),
    ],
  },
  {
    id: "光通信", name: "光通信", children: [
      makeChild("leader", 2, [STOCK_012, STOCK_013]),
      makeChild("follower", 3, [STOCK_015, STOCK_014, STOCK_010]),
    ],
  },
  {
    id: "锂电池", name: "锂电池", children: [
      makeChild("leader", 2, [STOCK_018, STOCK_019]),
      makeChild("follower", 2, [STOCK_025, STOCK_003]),
    ],
  },
];

// ─── 发酵路径 ──────────────────────────────────

/** 从节点树中查找 stocks */

export const MOCK_EVO_PATHS: EvoPath[] = [
  {
    steps: [
      { id: nodeId("半导体", "leader"), label: "半导体·龙头", theme: "半导体", childType: "leader", stockCount: 2, stocks: [STOCK_010, STOCK_011] },
      { id: nodeId("存储", "follower"), label: "存储·跟风", theme: "存储", childType: "follower", stockCount: 4, stocks: [STOCK_014, STOCK_010, STOCK_011, STOCK_015] },
      { id: nodeId("AI硬件", "diffusion"), label: "AI硬件·扩散", theme: "AI硬件", childType: "diffusion", stockCount: 10, stocks: [STOCK_014, STOCK_004, STOCK_006, STOCK_002, STOCK_001, STOCK_003, STOCK_018, STOCK_022, STOCK_023, STOCK_020] },
    ],
    links: [
      { source: nodeId("半导体", "leader"), target: nodeId("存储", "follower"), value: 5 },
      { source: nodeId("存储", "follower"), target: nodeId("AI硬件", "diffusion"), value: 12 },
    ],
  },
  {
    steps: [
      { id: nodeId("医疗医药", "leader"), label: "医疗医药·龙头", theme: "医疗医药", childType: "leader", stockCount: 2, stocks: [STOCK_021, STOCK_020] },
      { id: nodeId("医药", "follower"), label: "医药·跟风", theme: "医药", childType: "follower", stockCount: 3, stocks: [STOCK_020, STOCK_016, STOCK_017] },
      { id: nodeId("其他", "diffusion"), label: "其他·扩散", theme: "其他", childType: "diffusion", stockCount: 4, stocks: [STOCK_022, STOCK_002, STOCK_006, STOCK_005] },
    ],
    links: [
      { source: nodeId("医疗医药", "leader"), target: nodeId("医药", "follower"), value: 4 },
      { source: nodeId("医药", "follower"), target: nodeId("其他", "diffusion"), value: 3 },
    ],
  },
  {
    steps: [
      { id: nodeId("机器人", "leader"), label: "机器人·龙头", theme: "机器人", childType: "leader", stockCount: 3, stocks: [STOCK_004, STOCK_005, STOCK_006] },
      { id: nodeId("算力", "follower"), label: "算力·跟风", theme: "算力", childType: "follower", stockCount: 4, stocks: [STOCK_015, STOCK_012, STOCK_013, STOCK_008] },
      { id: nodeId("光通信", "diffusion"), label: "光通信·扩散", theme: "光通信", childType: "diffusion", stockCount: 3, stocks: [STOCK_012, STOCK_013, STOCK_015] },
    ],
    links: [
      { source: nodeId("机器人", "leader"), target: nodeId("算力", "follower"), value: 6 },
      { source: nodeId("算力", "follower"), target: nodeId("光通信", "diffusion"), value: 4 },
    ],
  },
  {
    steps: [
      { id: nodeId("AI硬件", "leader"), label: "AI硬件·龙头", theme: "AI硬件", childType: "leader", stockCount: 3, stocks: [STOCK_007, STOCK_008, STOCK_009] },
      { id: nodeId("半导体", "follower"), label: "半导体·跟风", theme: "半导体", childType: "follower", stockCount: 5, stocks: [STOCK_014, STOCK_007, STOCK_015, STOCK_002, STOCK_006] },
      { id: nodeId("锂电池", "diffusion"), label: "锂电池·扩散", theme: "锂电池", childType: "diffusion", stockCount: 2, stocks: [STOCK_018, STOCK_019] },
    ],
    links: [
      { source: nodeId("AI硬件", "leader"), target: nodeId("半导体", "follower"), value: 7 },
      { source: nodeId("半导体", "follower"), target: nodeId("锂电池", "diffusion"), value: 3 },
    ],
  },
];

// ─── 完整数据集 ─────────────────────────────────

export const MOCK_THEME_EVOLUTION_DATA: ThemeEvolutionData = {
  nodes: MOCK_THEME_EVO_NODES,
  paths: MOCK_EVO_PATHS,
  sankeyNodes: [],
  sankeyLinks: [],
  summary: null,
  updatedAt: Date.now(),
};

// ─── Raw → Domain 转换 ─────────────────────────

/** 将 API 原始响应转为 Domain 模型 */
export function buildDomainFromRaw(raw: RawThemeEvolutionResponse): ThemeEvolutionData {
  const { sankeyData } = raw;

  // 按主题分组（去name前缀如"福建(龙头)"提取主题名和类型）
  const themeMap = new Map<string, ThemeEvoNode>();

  for (const rawNode of sankeyData.nodes) {
    // 从 "主题名(龙头/跟风/扩散)" 提取
    const match = rawNode.name.match(/^(.+?)\((龙头|跟风|扩散)\)$/);
    if (!match) continue;
    const themeName = match[1]!;
    const childLabel = match[2]!;
    const childType: "leader" | "follower" | "diffusion" =
      childLabel === "龙头" ? "leader" : childLabel === "跟风" ? "follower" : "diffusion";

    const stocks = (rawNode.stocks ?? []).map(mapRawEvoStock);

    if (!themeMap.has(themeName)) {
      themeMap.set(themeName, { id: themeName, name: themeName, children: [] });
    }
    themeMap.get(themeName)!.children.push({
      type: childType,
      label: childLabel,
      stockCount: rawNode.stockCount,
      stocks,
    });
  }

  const nodes = Array.from(themeMap.values());

  // 构建路径
  const paths: EvoPath[] = [];
  const layerGroups = new Map<number, typeof sankeyData.nodes>();

  for (const node of sankeyData.nodes) {
    const layer = node.layer ?? 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(node);
  }

  // 通过 links 构建路径：leader(0) → follower(1) → diffusion(2)
  for (const link of sankeyData.links) {
    const sourceNode = sankeyData.nodes.find((n) => n.id === link.source);
    const targetNode = sankeyData.nodes.find((n) => n.id === link.target);
    if (!sourceNode || !targetNode) continue;

    const sourceMatch = sourceNode.name.match(/^(.+?)\((龙头|跟风|扩散)\)$/);
    const targetMatch = targetNode.name.match(/^(.+?)\((龙头|跟风|扩散)\)$/);
    if (!sourceMatch || !targetMatch) continue;

    const parseType = (label: string): "leader" | "follower" | "diffusion" =>
      label === "龙头" ? "leader" : label === "跟风" ? "follower" : "diffusion";

    const sourceStocks = (sourceNode.stocks ?? []).map(mapRawEvoStock);
    const targetStocks = (targetNode.stocks ?? []).map(mapRawEvoStock);

    // 找 target 的下一跳
    const downstreamLinks = sankeyData.links.filter((l) => l.source === link.target);
    if (downstreamLinks.length > 0) {
      for (const dsLink of downstreamLinks) {
        const dsNode = sankeyData.nodes.find((n) => n.id === dsLink.target);
        if (!dsNode) continue;
        const dsMatch = dsNode.name.match(/^(.+?)\((龙头|跟风|扩散)\)$/);
        if (!dsMatch) continue;
        const dsStocks = (dsNode.stocks ?? []).map(mapRawEvoStock);

        paths.push({
          steps: [
            {
              id: sourceNode.id, label: sourceNode.name, theme: (sourceMatch[1]! ?? ""),
              childType: parseType((sourceMatch[2]! ?? "")), stockCount: sourceNode.stockCount,
              stocks: sourceStocks,
            },
            {
              id: targetNode.id, label: targetNode.name, theme: (targetMatch[1]! ?? ""),
              childType: parseType((targetMatch[2]! ?? "")), stockCount: targetNode.stockCount,
              stocks: targetStocks,
            },
            {
              id: dsNode.id, label: dsNode.name, theme: (dsMatch[1]! ?? ""),
              childType: parseType((dsMatch[2]! ?? "")), stockCount: dsNode.stockCount,
              stocks: dsStocks,
            },
          ],
          links: [
            { source: sourceNode.id, target: targetNode.id, value: link.value },
            { source: targetNode.id, target: dsNode.id, value: dsLink.value },
          ],
        });
      }
    }
  }

  return {
    nodes,
    paths,
    sankeyNodes: sankeyData.nodes,
    sankeyLinks: sankeyData.links,
    summary: raw.summary,
    updatedAt: Date.now(),
  };
}

// ─── 辅助函数 ─────────────────────────────────

export function findNodeById(id: string): ThemeEvoNode | undefined {
  return MOCK_THEME_EVO_NODES.find((n) => n.id === id);
}

export function findPathsByTheme(themeId: string): EvoPath[] {
  return MOCK_EVO_PATHS.filter((p) => p.steps.some((s) => s.theme === themeId));
}
