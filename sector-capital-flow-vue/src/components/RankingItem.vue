<template>
  <div
    :class="['ranking-item', { highlighted: highlighted }]"
    @click="$emit('toggle')"
    @mouseenter="$emit('hover', item.name)"
  >
    <span class="dot" :style="{ background: item.color }" />
    <span class="name">{{ item.name }}</span>
    <div class="bar-wrap">
      <div class="bar" :style="{ width: barWidth + '%', background: barColor }" />
    </div>
    <span :class="['value', item.value >= 0 ? 'up' : 'down']">
      {{ item.value >= 0 ? '+' : '' }}{{ item.value.toFixed(1) }}亿
    </span>
    <el-checkbox
      :model-value="checked"
      size="small"
      class="check-box"
      @change="$emit('toggle')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  item: { type: Object, required: true },
  maxAbs: { type: Number, default: 1 },
  checked: { type: Boolean, default: true },
  highlighted: { type: Boolean, default: false },
});

defineEmits(['toggle', 'hover']);

const barWidth = computed(() => Math.min((Math.abs(props.item.value) / props.maxAbs) * 100, 100));

const barColor = computed(() => {
  return props.item.value >= 0
    ? 'linear-gradient(90deg, #ffcdd2, #c0392b)'
    : 'linear-gradient(90deg, #a5d6a7, #27ae60)';
});
</script>

<style scoped lang="scss">
.ranking-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
  &.highlighted { background: #f0f5ff; }
  &:hover { background: #f5f7fa; }
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.name {
  font-size: 13px;
  color: #303133;
  width: 60px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar-wrap {
  flex: 1;
  height: 6px;
  background: #f0f2f5;
  border-radius: 3px;
  overflow: hidden;
  min-width: 40px;
}
.bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.value {
  font-size: 12px;
  font-family: Consolas, Monaco, monospace;
  width: 72px;
  text-align: right;
  flex-shrink: 0;
  &.up { color: #c0392b; }
  &.down { color: #27ae60; }
}
.check-box {
  flex-shrink: 0;
}
</style>