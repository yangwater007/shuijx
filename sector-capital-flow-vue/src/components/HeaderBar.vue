<template>
  <div class="header-bar">
    <div class="header-left">
      <el-date-picker
        :model-value="selectedDate"
        type="date"
        placeholder="????"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        size="small"
        class="date-picker"
        :clearable="false"
        @update:model-value="onDateChange"
      />
      <div class="category-tabs">
        <span
          v-for="cat in categories"
          :key="cat"
          :class="['category-tab', { active: activeCategory === cat }]"
          @click="emit('update:activeCategory', cat)"
        >{{ cat }}</span>
      </div>
      <el-button :icon="Refresh" size="small" circle class="refresh-btn" @click="emit('refresh')" />
      <el-input
        :model-value="searchText"
        placeholder="?????????"
        :prefix-icon="Search"
        size="small"
        class="search-input"
        clearable
        @update:model-value="emit('update:searchText', $event)"
      />
      <el-checkbox
        :model-value="onlyFollowed"
        size="small"
        class="follow-check"
        @update:model-value="emit('update:onlyFollowed', $event)"
      >
        ????
      </el-checkbox>
    </div>
    <div class="header-right">
      <span class="status-dot" />
      <span class="status-text">????</span>
      <span class="update-time">??? {{ updateTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { Refresh, Search } from '@element-plus/icons-vue';
import { sectorCategories } from '../mock/sectorFlow.js';

const props = defineProps({
  date: { type: String, default: '2026-07-31' },
  activeCategory: { type: String, default: '??' },
  searchText: { type: String, default: '' },
  onlyFollowed: { type: Boolean, default: false },
  updateTime: { type: String, default: '15:00' },
});

const emit = defineEmits(['update:date', 'update:activeCategory', 'refresh', 'update:searchText', 'update:onlyFollowed']);

const categories = sectorCategories;
const selectedDate = ref(props.date);
watch(() => props.date, (val) => { selectedDate.value = val; });

function onDateChange(val) {
  selectedDate.value = val;
  emit('update:date', val);
}
</script>

<style scoped lang="scss">
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
  background: #fff;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date-picker {
  width: 140px;
}
.category-tabs {
  display: flex;
  gap: 0;
}
.category-tab {
  padding: 4px 12px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  &:hover { color: #303133; }
  &.active {
    color: #303133;
    font-weight: 600;
    border-bottom-color: #409eff;
  }
}
.refresh-btn {
  border: none;
  background: transparent;
  color: #606266;
  &:hover { color: #409eff; }
}
.search-input {
  width: 280px;
}
.follow-check {
  white-space: nowrap;
  font-size: 13px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #67c23a;
}
</style>
