<script setup lang="ts">
import type { FilterTag } from '@/types'

defineProps<{
  tags: FilterTag[]
}>()

const emit = defineEmits<{
  (e: 'remove', dimension: FilterTag['dimension']): void
}>()

const DIMENSION_LABEL: Record<FilterTag['dimension'], string> = {
  region: '地区',
  vehicleType: '车辆',
  accidentType: '事故'
}
</script>

<template>
  <div v-if="tags.length > 0" class="filter-tag-bar">
    <span
      v-for="tag in tags"
      :key="tag.dimension"
      class="filter-tag"
      @click="emit('remove', tag.dimension)"
    >
      <span class="filter-tag__dim">{{ DIMENSION_LABEL[tag.dimension] }}</span>
      <span class="filter-tag__value">{{ tag.label }}</span>
      <span class="filter-tag__close">×</span>
    </span>
    <span class="filter-tag-bar__hint">点击标签解除过滤</span>
  </div>
  <div v-else class="filter-tag-bar filter-tag-bar--empty">全域视图 · 点击地图或图表可联动过滤</div>
</template>

<style scoped>
.filter-tag-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}

.filter-tag-bar--empty {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1px;
  white-space: nowrap;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 3px 10px;
  border-radius: var(--radius-tag);
  font-size: 12px;
  cursor: pointer;
  color: var(--text-primary);
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.14), rgba(138, 43, 226, 0.16));
  border: 1px solid rgba(0, 240, 255, 0.4);
  transition: all 0.2s ease;
}

.filter-tag:hover {
  border-color: var(--neon-magenta);
  box-shadow: 0 0 10px rgba(255, 45, 149, 0.35);
}

.filter-tag__dim {
  color: var(--neon-cyan);
  font-size: 11px;
}

.filter-tag__close {
  color: var(--neon-magenta);
  font-weight: 700;
  margin-left: 2px;
}

.filter-tag-bar__hint {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>