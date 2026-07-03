/** 数据层 — 条件选股 Repository（东方财富 API） */

import type { Stock } from "@infra/types/stock";
import type { SelectorCriteria } from "@data/dto/selector";

const EM_BASE = "https://push2.eastmoney.com/api/qt/clist/get";
const EM_REFERER = "https://quote.eastmoney.com/";

/** 东方财富字段映射 */
const EM_FIELDS = [
  "f2",  // 最新价
  "f3",  // 涨跌幅
  "f4",  // 涨跌额
  "f5",  // 成交量(手)
  "f6",  // 成交额
  "f7",  // 振幅
  "f8",  // 换手率
  "f10", // 量比
  "f12", // 股票代码
  "f14", // 股票名称
  "f15", // 最高
  "f16", // 最低
  "f17", // 开盘
  "f18", // 昨收
  "f20", // 总市值
  "f21", // 流通市值
  "f9",  // 市盈率(动态)
  "f23", // 市净率
].join(",");

/** 排序字段映射 */
const SORT_MAP: Record<string, string> = {
  changePct: "f3",
  volume: "f5",
  price: "f2",
};

/** 市场范围：沪A + 深A + 创业板 + 科创板 */
const ALL_A = "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23";

interface RawStock {
  f2?: number;  f3?: number;  f4?: number;
  f5?: number;  f6?: number;  f7?: number;
  f8?: number;  f10?: number; f12?: string;
  f14?: string; f15?: number; f16?: number;
  f17?: number; f18?: number; f20?: number;
  f21?: number; f9?: number;  f23?: number;
}

/** Raw → Domain 映射 */
function mapRawStock(raw: RawStock): Stock {
  const code = raw.f12 ?? "000000";
  return {
    code,
    name: raw.f14 ?? "未知",
    price: raw.f2 ?? 0,
    changePct: raw.f3 ?? 0,
    change: raw.f4 ?? 0,
    volume: raw.f5 ?? 0,
    amount: raw.f6 ?? 0,
    turnover: raw.f6 ?? 0,
    amplitude: raw.f7 ?? 0,
    turnoverRate: raw.f8 ?? 0,
    volumeRatio: raw.f10 ?? 0,
    high: raw.f15 ?? 0,
    low: raw.f16 ?? 0,
    open: raw.f17 ?? 0,
    preClose: raw.f18 ?? 0,
    marketCap: raw.f20 ?? 0,
    circulatingCap: raw.f21 ?? 0,
    pe: raw.f9 ?? 0,
    pb: raw.f23 ?? 0,
  };
}

/** 按条件获取股票列表 */
async function fetchByCriteria(criteria: SelectorCriteria): Promise<Stock[]> {
  const sortField = SORT_MAP[criteria.sortBy ?? "changePct"] ?? "f3";
  const sortOrder = criteria.sortOrder === "asc" ? 0 : 1;

  const params = new URLSearchParams({
    pn: "1",
    pz: criteria.concept ? "200" : "500", // 有关键词时少取
    po: String(sortOrder),
    np: "1",
    fltt: "2",
    invt: "2",
    fid: sortField,
    fs: ALL_A,
    fields: EM_FIELDS,
  });

  const url = `${EM_BASE}?${params.toString()}`;
  const resp = await fetch(url, { headers: { Referer: EM_REFERER } });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const json = await resp.json() as {
    data?: { diff?: RawStock[]; total?: number };
  };

  const rawList = json.data?.diff ?? [];
  return rawList.map(mapRawStock);
}

const selectorRepository = { fetchByCriteria };
export default selectorRepository;