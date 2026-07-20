/** sectorCapitalFlow DTO - quicktiny API */
export interface SectorCapitalFlowRow {
  sectorCode: string; sectorName: string;
  mainNetAmount: number; bigOrderNetAmount: number;
  strength: number; pctChg: number;
  mainBuyAmount: number; mainSellAmount: number;
  memberCount: number; floatMarketCap: number;
  relativeInflow: number; changeFromOpen: number;
}
export interface SectorCapitalFlowSnapshot {
  mode: string; tradeDate: string; total: number; returned: number;
  rows: SectorCapitalFlowRow[];
}
export interface SectorCapitalFlowResponse { success: boolean; data: SectorCapitalFlowSnapshot; }
