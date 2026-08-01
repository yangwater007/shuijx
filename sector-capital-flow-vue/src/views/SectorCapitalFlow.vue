<template>
  <div class="sector-capital-flow-page">
    <HeaderBar
      :date="date"
      :active-category="activeCategory"
      :search-text="searchText"
      :update-time="updateTime"
      @update:date="date = $event"
      @update:active-category="activeCategory = $event"
      @refresh="handleRefresh"
      @update:search-text="searchText = $event"
    />
    <ToolBar
      :update-time="updateTime"
      :total-sectors="mockData.totalSectors"
      :selected-count="visibleKeys.length"
      :max-select="30"
      :tray-count="10"
      @clear-tray="handleClearTray"
    />
    <TabBar
      :active-dimension="activeDimension"
      :active-time="activeTime"
      :active-display="activeDisplay"
      :index-overlay="showIndex"
      :active-index="activeIndex"
      :active-y-base="activeYBase"
      @update:active-dimension="activeDimension = $event"
      @update:active-time="activeTime = $event"
      @update:active-display="activeDisplay = $event"
      @update:index-overlay="showIndex = $event"
      @update:active-index="activeIndex = $event"
      @update:active-y-base="activeYBase = $event"
    />
    <YAxisBar
      :active-mode="yAxisMode"
      @update:active-mode="yAxisMode = $event"
    />
    <div class="main-content">
      <FlowChart
        :time-points="mockData.timePoints"
        :inflow-data="mockData.inflowTop5"
        :outflow-data="mockData.outflowTop5"
        :index-trend="mockData.indexTrend"
        :show-index="showIndex"
        :active-dimension="activeDimension"
        :visible-keys="visibleKeys"
        @hover-sector="hoveredSector = $event"
      />
      <RankingPanel
        :inflow-data="mockData.inflowTop5"
        :outflow-data="mockData.outflowTop5"
        :visible-keys="visibleKeys"
        :hovered-sector="hoveredSector"
        :active-rank-tab="activeRankTab"
        @toggle-visible="handleToggleVisible"
        @hover-sector="hoveredSector = $event"
        @update:active-rank-tab="activeRankTab = $event"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import HeaderBar from '../components/HeaderBar.vue';
import ToolBar from '../components/ToolBar.vue';
import TabBar from '../components/TabBar.vue';
import YAxisBar from '../components/YAxisBar.vue';
import FlowChart from '../components/FlowChart.vue';
import RankingPanel from '../components/RankingPanel.vue';
import { sectorFlowData } from '../mock/sectorFlow.js';

const mockData = sectorFlowData;

const date = ref('2026-07-31');
const activeCategory = ref('精选');
const searchText = ref('');
const updateTime = ref('15:00');
const activeDimension = ref('主力净额');
const activeTime = ref('当日走势');
const activeDisplay = ref('时间轴');
const showIndex = ref(true);
const activeIndex = ref('上证');
const activeYBase = ref('累计净额');
const yAxisMode = ref('智能尺度');
const activeRankTab = ref('资金两端');
const hoveredSector = ref('');

const visibleKeys = ref([
  ...mockData.inflowTop5.map(s => s.name),
  ...mockData.outflowTop5.map(s => s.name),
]);

function handleToggleVisible(name) {
  const idx = visibleKeys.value.indexOf(name);
  if (idx >= 0) {
    visibleKeys.value.splice(idx, 1);
  } else {
    visibleKeys.value.push(name);
  }
}

function handleRefresh() {
  updateTime.value = '15:00';
}

function handleClearTray() {
  visibleKeys.value = [];
}
</script>

<style scoped lang="scss">
.sector-capital-flow-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff;
}
.main-content {
  flex: 1;
  display: flex;
  min-height: 0;
}
</style>