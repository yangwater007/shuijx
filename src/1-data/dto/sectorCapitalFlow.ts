/**
 * 板块资金流向 DTO — 100% 对齐 quicktiny /sector-capital-flow/snapshot
 */
export interface SectorCapitalFlowRow {
  sectorCode: string;
  sectorName: string;
  themeCode: string;
  themeName: string;
  mainNetAmount: number;
  bigOrderNetAmount: number;
  strength: number;
  pctChg: number;
  mainBuyAmount: number;
  mainSellAmount: number;
  memberCount: number;
  pctChgCoverage: number;
  floatMarketCap: number;
  relativeInflow: number;
  universe: string;
  changeFromOpen: number;
}

export interface SectorCapitalFlowSnapshot {
  mode: string;
  tradeDate: string;
  actualTradeDate: string;
  universe: string;
  snapshotTime: string;
  snapshotMinute: string;
  total: number;
  returned: number;
  rows: SectorCapitalFlowRow[];
}


/** 板块资金时序数据 */
export interface SectorCapitalFlowTimelinePoint {
  time: string;
  tradeDate: string;
  snapshotMinute: string;
  sectorCode: string;
  sectorName: string;
  mainNetAmount: number;
  bigOrderNetAmount: number;
  strength: number;
  pctChg: number;
  relativeInflow: number;
  floatMarketCap: number;
}

export interface SectorCapitalFlowTimelineResponse {
  success: boolean;
  data: {
    sectorCode: string;
    sectorName: string;
    points: SectorCapitalFlowTimelinePoint[];
  };
}

/** 板块成分股 */
export interface SectorConstituent {
  stockCode: string;
  stockName: string;
  mainNetAmount: number;
  pctChg: number;
  floatMarketCap: number;
  weight: number;
}

export interface SectorConstituentsResponse {
  success: boolean;
  data: {
    sectorCode: string;
    sectorName: string;
    constituents: SectorConstituent[];
  };
}

/** 可用日期 */
export interface SectorCapitalFlowDatesResponse {
  success: boolean;
  data: string[];
}

export interface SectorCapitalFlowResponse {
  success: boolean;
  data: SectorCapitalFlowSnapshot;
}
