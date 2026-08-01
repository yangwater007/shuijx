
import type { SectorCapitalFlowResponse, SectorCapitalFlowTimelineResponse, SectorConstituentsResponse, SectorCapitalFlowDatesResponse } from "@data/dto/sectorCapitalFlow";
const API = "https://stock.quicktiny.cn/api/sector-capital-flow";

export async function fetchSectorCapitalFlowSnapshot(): Promise<SectorCapitalFlowResponse> {
  const resp = await fetch(API + "/snapshot");
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}

export async function fetchSectorTimeline(sectorCode: string): Promise<SectorCapitalFlowTimelineResponse> {
  const resp = await fetch(API + "/continuous-timeline?sectorCode=" + sectorCode);
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}

export async function fetchSectorConstituents(sectorCode: string): Promise<SectorConstituentsResponse> {
  const resp = await fetch(API + "/constituents?sectorCode=" + sectorCode);
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}

export async function fetchCapitalFlowDates(): Promise<SectorCapitalFlowDatesResponse> {
  const resp = await fetch(API + "/dates");
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  return resp.json();
}
