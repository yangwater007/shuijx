<template>
  <div class="yaxis-bar">
    <span class="yaxis-label">纵轴</span>
    <span
      v-for="m in modes"
      :key="m"
      :class="['yaxis-tab', { active: activeMode === m }]"
      @click="$emit('update:activeMode', m)"
    >{{ m }}</span>
  </div>
</template>

<script setup>
import { yAxisModes } from '../mock/sectorFlow.js';

defineProps({
  activeMode: { type: String, default: '智能尺度' },
});
defineEmits(['update:activeMode']);

const modes = yAxisModes;
</script>

<style scoped lang="scss">
.yaxis-bar {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 16px;
  gap: 16px;
  font-size: 12px;
}
.yaxis-label { color: #909399; }
.yaxis-tab {
  color: #909399;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: #303133; }
  &.active { color: #303133; font-weight: 600; }
}
</style>