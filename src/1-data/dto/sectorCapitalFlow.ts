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

export interface SectorCapitalFlowResponse {
  success: boolean;
  data: SectorCapitalFlowSnapshot;
}
