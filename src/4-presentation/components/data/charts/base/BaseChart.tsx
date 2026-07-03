/**
 * BaseChart — 通用 ECharts 图表组件
 * 封装图表生命周期：初始化、resize、loading、空数据、销毁
 *
 * 使用方式：
 *   <BaseChart option={opt} height={400} loading={isLoading} showNoData={!data.length} />
 */

import { useRef, type FC, type CSSProperties } from "react";
import type { EChartsOption } from "echarts";
import useECharts from "@ui/components/charts/ECharts/hooks/useECharts";

export interface BaseChartProps {
  /** ECharts 配置 */
  option: EChartsOption;
  /** 主题名称或对象（默认 stock-dark） */
  theme?: string | object;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否显示无数据提示 */
  showNoData?: boolean;
  /** 无数据提示文本 */
  noDataText?: string;
  /** 容器样式 */
  style?: CSSProperties;
  /** 类名 */
  className?: string;
  /** 图表就绪回调，可获取 echarts 实例做自定义操作 */
  onChartReady?: (instance: ReturnType<typeof import("echarts").init>) => void;
  /** 高度，默认 300px */
  height?: number | string;
  /** 宽度，默认 100% */
  width?: number | string;
}

const BaseChart: FC<BaseChartProps> = ({
  option,
  theme,
  loading = false,
  showNoData = false,
  noDataText = "暂无数据",
  style,
  className,
  onChartReady,
  height = 300,
  width = "100%",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useECharts({
    container: containerRef.current,
    option,
    theme,
    loading,
    onReady: onChartReady,
  });

  if (showNoData) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border-2 border-dashed ${className ?? ""}`}
        style={{
          height,
          width,
          borderColor: "var(--board-border)",
          backgroundColor: "var(--board-card)",
          ...style,
        }}
      >
        <p className="text-sm text-slate-500">{noDataText}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height,
        width,
        ...style,
      }}
    />
  );
};

export default BaseChart;
