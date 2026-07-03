/**
 * MiniKLine — 列表视图中的迷你K线图
 * 使用股票代码作为种子生成确定性的模拟K线，保证同一股票每次渲染一致
 */

import { useMemo, type FC } from "react";
import { BaseChart } from "@ui/components/data/charts";
import type { EChartsOption } from "echarts";

/** 简单的确定性伪随机数生成器（基于字符串哈希） */
function createSeededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) | 0;
    return (h >>> 0) / 0xFFFFFFFF;
  };
}

interface Props {
  /** 收盘价序列（若提供则使用真实数据） */
  closePrices?: number[];
  /** 种子字符串（如股票代码），用于生成确定性模拟数据 */
  seed?: string;
  /** 高度 */
  height?: number;
}

function generateOHLC(closes: number[], rand: () => number): number[][] {
  return closes.map((c) => {
    const open = +(c * (0.98 + rand() * 0.04)).toFixed(2);
    const high = +(Math.max(open, c) * (1 + rand() * 0.015)).toFixed(2);
    const low = +(Math.min(open, c) * (1 - rand() * 0.015)).toFixed(2);
    return [open, c, low, high];
  });
}

const MiniKLine: FC<Props> = ({ closePrices, seed = "000000", height = 36 }) => {
  const mockPrices = useMemo(() => {
    if (closePrices && closePrices.length >= 5) {
      return closePrices.slice(-25);
    }
    // 基于种子生成确定性的模拟收盘价序列
    const rand = createSeededRandom(seed);
    let price = 20 + rand() * 10;
    return Array.from({ length: 25 }, () => {
      price = +(price * (0.97 + rand() * 0.06)).toFixed(2);
      return price;
    });
  }, [closePrices, seed]);

  const rand = useMemo(() => createSeededRandom(seed), [seed]);

  const option: EChartsOption = useMemo(() => {
    const ohlc = generateOHLC(mockPrices, rand);
    return {
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { show: false, data: ohlc.map((_, i) => i) },
      yAxis: { show: false, scale: true },
      series: [
        {
          type: "candlestick",
          data: ohlc,
          itemStyle: {
            color: "#ef4444",
            color0: "#22c55e",
            borderColor: "#ef4444",
            borderColor0: "#22c55e",
            borderWidth: 0.5,
          },
          barWidth: "60%",
          barMaxWidth: 3,
        },
      ],
    };
  }, [mockPrices, rand]);

  return (
    <div className="flex items-center justify-center" style={{ width: 90, height }}>
      <BaseChart option={option} height={height} width={90} />
    </div>
  );
};

export default MiniKLine;
