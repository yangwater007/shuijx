<template>
  <div class="ranking-panel">
    <!-- ??? -->
    <div class="panel-header">
      <span class="panel-title">
        ????
        <el-tooltip content="?????????????" placement="top">
          <el-icon :size="14" class="help-icon"><QuestionFilled /></el-icon>
        </el-tooltip>
      </span>
      <div class="sub-tabs">
        <span
          v-for="tab in rankingTabs"
          :key="tab"
          :class="['sub-tab', { active: activeRankTab === tab }]"
          @click="$emit('update:activeRankTab', tab)"
        >{{ tab }}</span>
      </div>
    </div>
    <!-- ???? -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">????</span>
        <span class="section-count">{{ inflowData.length }}?</span>
      </div>
      <RankingItem
        v-for="item in inflowData"
        :key="item.name"
        :item="item"
        :max-abs="maxAbs"
        :checked="visibleKeys.includes(item.name)"
        :highlighted="hoveredSector === item.name"
        @toggle="$emit('toggleVisible', item.name)"
        @hover="name => $emit('hoverSector', name)"
      />
    </div>
    <!-- ???? -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">????</span>
        <span class="section-count">{{ outflowData.length }}?</span>
      </div>
      <RankingItem
        v-for="item in outflowData"
        :key="item.name"
        :item="item"
        :max-abs="maxAbs"
        :checked="visibleKeys.includes(item.name)"
        :highlighted="hoveredSector === item.name"
        @toggle="$emit('toggleVisible', item.name)"
        @hover="name => $emit('hoverSector', name)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import { rankingTabs } from '../mock/sectorFlow.js';
import RankingItem from './RankingItem.vue';

const props = defineProps({
  inflowData: { type: Array, default: () => [] },
  outflowData: { type: Array, default: () => [] },
  visibleKeys: { type: Array, default: () => [] },
  hoveredSector: { type: String, default: '' },
  activeRankTab: { type: String, default: '????' },
});

defineEmits(['toggleVisible', 'hoverSector', 'update:activeRankTab']);

const maxAbs = computed(() => {
  return Math.max(
    ...props.inflowData.map(d => d.value),
    ...props.outflowData.map(d => Math.abs(d.value)),
    1
  );
});
</script>

<style scoped lang="scss">
.ranking-panel {
  width: 320px;
  flex-shrink: 0;
  border-left: 1px solid #ebeef5;
  padding: 16px;
  overflow-y: auto;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 4px;
}
.help-icon {
  color: #c0c4cc;
  cursor: help;
}
.sub-tabs {
  display: flex;
  gap: 2px;
}
.sub-tab {
  padding: 2px 8px;
  font-size: 11px;
  color: #909399;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover { color: #606266; }
  &.active {
    color: #303133;
    background: #f0f2f5;
  }
}
.section {
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.section-count {
  font-size: 11px;
  color: #c0c4cc;
}
</style>
