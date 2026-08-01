<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="snapshot-time">?? {{ updateTime }}</span>
      <span class="divider">|</span>
      <span class="sector-count">??? {{ totalSectors }}</span>
    </div>
    <div class="toolbar-right">
      <span class="tray-info">???? {{ selectedCount }}/{{ maxSelect }} ? ?? {{ trayCount }}</span>
      <span class="clear-tray" @click="$emit('clearTray')">????</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  updateTime: { type: String, default: '15:00' },
  totalSectors: { type: Number, default: 269 },
  selectedCount: { type: Number, default: 10 },
  maxSelect: { type: Number, default: 30 },
  trayCount: { type: Number, default: 10 },
});
defineEmits(['clearTray']);
</script>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 16px;
  font-size: 12px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
}
.divider { color: #e4e7ed; }
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
}
.clear-tray {
  color: #409eff;
  cursor: pointer;
  &:hover { text-decoration: underline; }
}
</style>
