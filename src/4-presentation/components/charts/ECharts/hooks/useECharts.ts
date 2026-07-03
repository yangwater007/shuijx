/**
 * useECharts — ECharts 实例管理 Hook
 * 负责图表实例的创建、option同步、resize、销毁
 * 通过 ResizeObserver 确保容器有尺寸后才初始化
 */

import { useRef, useEffect, useCallback } from "react";
import type { EChartsType, EChartsOption } from "echarts";

interface UseEChartsOptions {
  container: HTMLElement | null;
  option: EChartsOption;
  theme?: string | object;
  loading?: boolean;
  onReady?: (instance: EChartsType) => void;
}

export default function useECharts({
  container,
  option,
  theme,
  loading,
  onReady,
}: UseEChartsOptions) {
  const chartRef = useRef<EChartsType | null>(null);
  const prevOptionRef = useRef<string>("");

  /** 初始化图表（仅首次） */
  const initChart = useCallback(
    async (el: HTMLElement) => {
      const { init } = await import("echarts");
      const instance = init(el, theme);
      chartRef.current = instance;
      onReady?.(instance);
      return instance;
    },
    [theme, onReady]
  );

  /** 新图表首次设置 option */
  const setChartOption = useCallback(
    (instance: EChartsType, opt: EChartsOption) => {
      const serialized = JSON.stringify(opt);
      prevOptionRef.current = serialized;
      instance.setOption(opt, { notMerge: true });
    },
    []
  );

  /** 更新已初始化图表的 option（核心修复：确保 option 变更后图表能更新） */
  const updateChartOption = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const serialized = JSON.stringify(option);
    if (prevOptionRef.current === serialized) return;
    prevOptionRef.current = serialized;
    chart.setOption(option, { notMerge: true });
  }, [option]);

  /** 尝试初始化图表：当容器有尺寸时创建实例并设置 option */
  const tryInit = useCallback(
    async (el: HTMLElement) => {
      if (el.clientWidth === 0 || el.clientHeight === 0) return;
      if (chartRef.current) return; // 已初始化

      const instance = await initChart(el);
      setChartOption(instance, option);
    },
    [option, initChart, setChartOption]
  );

  // 图表初始化后，option 变更时同步更新（修复 option 变更不生效的 bug）
  useEffect(() => {
    updateChartOption();
  }, [updateChartOption]);

  // 当 container 变化时尝试初始化
  useEffect(() => {
    if (!container) return;

    // 延迟一帧确保 DOM 布局完成
    const raf = requestAnimationFrame(() => {
      void tryInit(container);
    });
    return () => cancelAnimationFrame(raf);
  }, [container, tryInit]);

  // ResizeObserver: 容器出现尺寸后自动初始化
  useEffect(() => {
    if (!container || chartRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0 && !chartRef.current) {
        void tryInit(container);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [container, tryInit]);

  /** Loading 状态 */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (loading) {
      chart.showLoading("default", {
        text: "加载中...",
        color: "#ef4444",
        textColor: "#94a3b8",
        maskColor: "rgba(15, 23, 42, 0.6)",
      });
    } else {
      chart.hideLoading();
    }
  }, [loading]);

  /** 响应窗口 resize */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRef.current != null]);

  /** 组件卸载时 dispose */
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, []);

  return chartRef;
}
