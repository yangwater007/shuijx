/** 数据层 — 题材库 Repository */

import { mapRawThemeGraph } from "@data/dto/themes";
import type { ThemeGraphData } from "@infra/types/themes";

const GRAPH_API = "https://stock.quicktiny.cn/api/themes/graph";

/** 获取题材图谱数据 */
export async function fetchThemeGraph(): Promise<ThemeGraphData> {
  const resp = await fetch(GRAPH_API);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  return mapRawThemeGraph(json);
}