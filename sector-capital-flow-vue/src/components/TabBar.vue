<template>
  <div class="tabbar">
    <div class="tab-group">
      <span
        v-for="d in dataDimensions"
        :key="d"
        :class="['tab-btn', { active: activeDimension === d }]"
        @click="$emit('update:activeDimension', d)"
      >{{ d }}</span>
    </div>
    <span class="group-gap" />
    <div class="tab-group">
      <span
        v-for="d in timeDimensions"
        :key="d"
        :class="['tab-btn', { active: activeTime === d }]"
        @click="$emit('update:activeTime', d)"
      >{{ d }}</span>
    </div>
    <span class="group-gap" />
    <div class="tab-group text-group">
      <span
        v-for="d in displayModes"
        :key="d"
        :class="['text-tab', { active: activeDisplay === d }]"
        @click="$emit('update:activeDisplay', d)"
      >{{ d }}</span>
    </div>
    <span class="group-gap" />
    <div class="tab-group">
      <span class="index-label">叠加指数</span>
      <el-switch :model-value="indexOverlay" size="small" @update:model-value="$emit('update:indexOverlay', $event)" />
      <span
        v-for="idx in indexOptions"
        :key="idx"
        :class="['text-tab sm', { active: activeIndex === idx }]"
        @click="$emit('update:activeIndex', idx)"
      >{{ idx }}</span>
    </div>
    <span class="group-gap" />
    <div class="tab-group">
      <span
        v-for="d in yAxisBases"
        :key="d"
        :class="['tab-btn', { active: activeYBase === d }]"
        @click="$emit('update:activeYBase', d)"
      >{{ d }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { dataDimensions, timeDimensions, displayModes, indexOptions, yAxisBases } from '../mock/sectorFlow.js';

const props = defineProps({
  activeDimension: { type: String, default: '主力净额' },
  activeTime: { type: String, default: '当日走势' },
  activeDisplay: { type: String, default: '时间轴' },
  indexOverlay: { type: Boolean, default: true },
  activeIndex: { type: String, default: '上证' },
  activeYBase: { type: String, default: '累计净额' },
});
defineEmits(['update:activeDimension', 'update:activeTime', 'update:activeDisplay', 'update:indexOverlay', 'update:activeIndex', 'update:activeYBase']);
const indexOverlay = ref(props.indexOverlay);
</script>

<style scoped lang="scss">
.tabbar {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 16px;
  gap: 16px;
}
.tab-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.group-gap { width: 8px; }
.tab-btn {
  padding: 3px 10px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover { color: #409eff; }
  &.active {
    color: #409eff;
    background: #fff;
    border-color: #409eff;
  }
}
.text-tab {
  padding: 0 6px;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: #303133; }
  &.active { color: #303133; font-weight: 600; }
  &.sm { font-size: 11px; }
}
.index-label {
  font-size: 12px;
  color: #606266;
  margin-right: 4px;
}
</style>