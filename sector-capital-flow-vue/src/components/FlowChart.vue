<template>
  <div class="flow-chart-wrapper">
    <div ref="mainChartRef" class="main-chart"></div>
    <div ref="subChartRef" class="sub-chart" v-show="showIndex"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  timePoints: { type: Array, default: () => [] },
  inflowData: { type: Array, default: () => [] },
  outflowData: { type: Array, default: () => [] },
  indexTrend: { type: Object, default: () => ({ name: '????', data: [] }) },
  showIndex: { type: Boolean, default: true },
  activeDimension: { type: String, default: '????' },
  visibleKeys: { type: Array, default: () => [] },
});

const emit = defineEmits(['hoverSector']);
const mainChartRef = ref(null);
const subChartRef = ref(null);
let mainChart = null;
let subChart = null;

function getVisibleSeries() {
  const all = [...props.inflowData, ...props.outflowData];
  if (!props.visibleKeys || props.visibleKeys.length === 0) {
    return all.map((s, i) => ({ ...s, visible: i < 5 || s.name === '??' }));
  }
  return all.map(s => ({ ...s, visible: props.visibleKeys.includes(s.name) }));
}

function buildMainOption() {
  const series = getVisibleSeries();
  const visible = series.filter(s => s.visible);
  const colors = [...visible.map(s => s.color)];

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: { color: '#303133', fontSize: 12 },
      formatter(params) {
        let html = '<div style="font-weight:600;margin-bottom:4px">' + params[0].axisValue + '</div>';
        params.forEach(p => {
          const val = p.value;
          const color = val >= 0 ? '#c0392b' : '#27ae60';
          const sign = val >= 0 ? '+' : '';
          html += '<div style="display:flex;align-items:center;gap:6px;margin:2px 0">' +
            '<span style="width:8px;height:8px;border-radius:50%;background:' + p.color + '"></span>' +
            '<span>' + p.seriesName + '</span>' +
            '<span style="color:' + color + ';font-family:Consolas,monospace;margin-left:auto">' + sign + val.toFixed(2) + '?</span>' +
            '</div>';
        });
        return html;
      },
    },
    legend: { show: false },
    grid: {
      left: 80, right: visible.length > 0 ? 60 : 20, top: 30, bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: props.timePoints,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisTick: { show: false },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '???????',
      nameTextStyle: { color: '#909399', fontSize: 12, padding: [0, 0, 0, 60] },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#909399',
        fontSize: 11,
        formatter: v => v === 0 ? '0.00?' : (v / 100) + '?',
      },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    },
    series: visible.map((s, idx) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color },
      emphasis: { focus: 'series' },
      markPoint: {
        data: [{
          name: s.name,
          coord: [s.data.length - 1, s.data[s.data.length - 1]],
          value: s.value.toFixed(1) + '?',
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: s.color },
          label: {
            show: true,
            position: 'right',
            distance: 8,
            fontSize: 11,
            color: '#303133',
            formatter: '{b} {c}',
          },
        }],
      },
    })),
  };
}

function buildSubOption() {
  return {
    tooltip: { trigger: 'axis', textStyle: { fontSize: 12 } },
    grid: { left: 80, right: 40, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: props.timePoints,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#e4e7ed' } },
      axisTick: { show: false },
      axisLabel: { color: '#909399', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '??????' + props.indexTrend.name,
      nameTextStyle: { color: '#909399', fontSize: 11, padding: [0, 0, 0, 60] },
      axisLabel: { color: '#909399', fontSize: 11, formatter: v => v.toFixed(2) + '%' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
    },
    series: [{
      name: props.indexTrend.name,
      type: 'line',
      data: props.indexTrend.data,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, color: '#4a90d9' },
      itemStyle: { color: '#4a90d9' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(74,144,217,0.15)' },
          { offset: 1, color: 'rgba(74,144,217,0.02)' },
        ]),
      },
    }],
  };
}

function initCharts() {
  if (mainChartRef.value) {
    mainChart = echarts.init(mainChartRef.value);
    mainChart.setOption(buildMainOption());
    mainChart.on('mouseover', params => {
      if (params.seriesName) emit('hoverSector', params.seriesName);
    });
  }
  if (subChartRef.value && props.showIndex) {
    subChart = echarts.init(subChartRef.value);
    subChart.setOption(buildSubOption());
  }
  window.addEventListener('resize', handleResize);
}

function handleResize() {
  mainChart?.resize();
  subChart?.resize();
}

watch(() => [props.inflowData, props.outflowData, props.visibleKeys, props.timePoints], () => {
  mainChart?.setOption(buildMainOption(), true);
  subChart?.setOption(buildSubOption(), true);
}, { deep: true });

watch(() => props.showIndex, async (val) => {
  if (val) {
    await nextTick();
    if (subChartRef.value) {
      subChart?.dispose();
      subChart = echarts.init(subChartRef.value);
      subChart.setOption(buildSubOption());
    }
  } else {
    subChart?.dispose();
    subChart = null;
  }
});

onMounted(() => { nextTick(initCharts); });
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  mainChart?.dispose();
  subChart?.dispose();
});
</script>

<style scoped lang="scss">
.flow-chart-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.main-chart {
  flex: 4;
  min-height: 0;
}
.sub-chart {
  flex: 1;
  min-height: 0;
  border-top: 1px solid #ebeef5;
}
</style>
