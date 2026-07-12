/**
 * 数据可视化页面 — 展示各类股票图表
 */

import { useState, useMemo, lazy, Suspense, type FC } from "react";
import PageHeader from "@ui/components/PageHeader";
import BaseChart from "@ui/components/charts/ECharts/BaseChart";
import getCandlestickOption from "@ui/components/charts/ECharts/configs/candlestick.config";
import getTimeshareOption from "@ui/components/charts/ECharts/configs/timeshare.config";
import getVolumeOption from "@ui/components/charts/ECharts/configs/volume.config";
import getPieOption from "@ui/components/charts/ECharts/configs/pie.config";
import getLineOption from "@ui/components/charts/ECharts/configs/line.config";
import type { KLineData, TimesharePoint, VolumeData, PieDataItem, LineData } from "@ui/components/charts/ECharts/configs/types";
import ThemeEvolution from "./components/ThemeEvolution";
import CapitalFlowView from "./components/CapitalFlowView";

/** 生成 K线 Mock 数据 */
function mockKLine(days: number): KLineData[] {
  let price = 25;
  const data: KLineData[] = [];
  for (let i = days; i >= 0; i--) {
    const open = price;
    const close = open + (Math.random() - 0.5) * 2;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    const volume = Math.floor(50000 + Math.random() * 100000);
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      open: +open.toFixed(2),
      close: +close.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      volume,
    });
    price = close;
  }
  return data;
}

/** 生成分时 Mock 数据 */
function mockTimeshare(): { data: TimesharePoint[]; preClose: number } {
  const preClose = 25.0;
  const data: TimesharePoint[] = [];
  let price = preClose + (Math.random() - 0.5) * 0.8;
  const periods = ["09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00"];
  for (const time of periods) {
    price = price + (Math.random() - 0.5) * 0.4;
    data.push({
      time,
      price: +price.toFixed(2),
      volume: Math.floor(5000 + Math.random() * 20000),
      avgPrice: +(preClose + (Math.random() - 0.3) * 0.5).toFixed(2),
    });
  }
  return { data, preClose };
}

/** 生成成交量 Mock 数据 */
function mockVolume(days: number): VolumeData[] {
  const data: VolumeData[] = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      volume: Math.floor(30000 + Math.random() * 120000),
      isUp: Math.random() > 0.45,
    });
  }
  return data;
}

/** 板块涨跌 Mock 饼图数据 */
const MOCK_PIE: PieDataItem[] = [
  { name: "半导体", value: 35 },
  { name: "人工智能", value: 28 },
  { name: "新能源", value: 22 },
  { name: "医药", value: 18 },
  { name: "消费", value: 15 },
  { name: "金融", value: 12 },
];

/** 板块演化 Mock 折线数据 */
const MOCK_LINE: LineData = {
  categories: ["周一", "周二", "周三", "周四", "周五"],
  series: [
    { name: "人工智能", data: [3.2, 4.1, 2.8, 5.6, 7.2] },
    { name: "半导体", data: [1.5, 2.3, 3.8, 4.2, 3.9] },
    { name: "新能源", data: [-0.5, 1.2, 2.1, 1.8, -0.3] },
  ],
};

type ChartTab = "kline" | "timeshare" | "fund" | "theme-evo";

/** Tab 标签配置 */
const TAB_CONFIG: { key: ChartTab; label: string }[] = [
  { key: "kline", label: "K线图" },
  { key: "timeshare", label: "分时图" },
  { key: "fund", label: "资金流向" },
  { key: "theme-evo", label: "题材演化" },
];

const Charts: FC = () => {
  const [tab, setTab] = useState<ChartTab>("kline");

  const klineData = useMemo(() => mockKLine(40), []);
  const timeshareData = useMemo(() => mockTimeshare(), []);
  const volumeData = useMemo(() => mockVolume(20), []);

  const klineOption = useMemo(
    () => getCandlestickOption(klineData, { title: "日K线图", showMA: true }),
    [klineData]
  );
  const timeshareOption = useMemo(
    () => getTimeshareOption(timeshareData.data, timeshareData.preClose),
    [timeshareData]
  );
  const volumeOption = useMemo(() => getVolumeOption(volumeData), [volumeData]);
  const pieOption = useMemo(() => getPieOption(MOCK_PIE, "板块资金分布"), []);
  const lineOption = useMemo(
    () => getLineOption(MOCK_LINE, { title: "板块涨跌演化", showArea: true }),
    []
  );

  // 获取当前 Tab 对应的副标题
  const subtitle = useMemo(() => {
    switch (tab) {
      case "kline": return "K线图、成交量、技术分析";
      case "timeshare": return "分时走势、实时波动";
      case "fund": return "大盘资金流、板块资金排行、桑基图";
      case "theme-evo": return "题材发酵路径、桑基图演化";
      default: return "K线、分时、资金流向、板块分析";
    }
  }, [tab]);

  return (
    <div>
      <PageHeader title="数据可视化" subtitle={subtitle} />

      {/* 工具切换 Tab */}
      <div className="mb-5 flex gap-2">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="rounded-lg px-5 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === key ? "#ef4444" : "var(--board-card)",
              color: tab === key ? "#fff" : "var(--stock-flat)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 题材演化 Tab — 独立全宽布局 */}
      {tab === "theme-evo" && <ThemeEvolution />}

      {/* 资金流向 Tab — 全新独立组件 */}
      {tab === "fund" && <CapitalFlowView />}

      {/* K线 / 分时图 Tabs */}
      {tab !== "theme-evo" && tab !== "fund" && (
        <>
          {/* 主图表区 */}
          <div className="mb-6">
            {tab === "kline" && (
              <BaseChart option={klineOption} height={420} />
            )}
            {tab === "timeshare" && (
              <BaseChart option={timeshareOption} height={380} />
            )}
          </div>

          {/* 辅助图表区 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
              <h3 className="mb-3 text-sm font-bold text-slate-300">成交量分布</h3>
              <BaseChart option={volumeOption} height={220} />
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--board-card)" }}>
              <BaseChart option={pieOption} height={260} />
            </div>
            <div className="rounded-xl p-4 lg:col-span-2" style={{ backgroundColor: "var(--board-card)" }}>
              <BaseChart option={lineOption} height={320} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Charts;
