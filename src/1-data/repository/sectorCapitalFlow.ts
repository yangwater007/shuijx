import type { SectorCapitalFlowResponse } from "@data/dto/sectorCapitalFlow";
const API = "https://stock.quicktiny.cn/api/sector-capital-flow";
export async function fetchSectorCapitalFlowSnapshot(): Promise<SectorCapitalFlowResponse> {
  const resp = await fetch(API + "/snapshot");
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}
