<script setup>
defineProps({
  icon: { type: String, default: '📭' },
  title: { type: String, default: '暂无任务' },
  hint: { type: String, default: '拖拽任务到此处或点击新增' },
  actionText: { type: String, default: '' },
  actionIcon: { type: String, default: '➕' }
})
const emit = defineEmits(['action'])
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-title">{{ title }}</div>
    <div class="empty-hint">{{ hint }}</div>
    <button v-if="actionText" class="empty-action" @click="emit('action')">
      <span>{{ actionIcon }}</span>
      <span>{{ actionText }}</span>
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-muted);
  text-align: center;
  gap: var(--space-2);
}
.empty-icon {
  font-size: 48px;
  opacity: 0.5;
  animation: pulse 2.5s ease-in-out infinite;
}
.empty-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-secondary);
}
.empty-hint {
  font-size: var(--font-size-sm);
}
.empty-action {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: all var(--transition-fast);
}
.empty-action:hover {
  background: var(--color-primary);
  color: #fff;
  transform: translateY(-2px);
}
</style>