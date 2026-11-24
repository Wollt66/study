<script setup>
import { computed } from 'vue'
import { formatRelativeTime } from '../utils/timeFormat'

const props = defineProps({
  task: { type: Object, required: true }
})
const emit = defineEmits(['toggle-star', 'toggle-urgent', 'remove', 'dragstart', 'dragend'])

const timeText = computed(() => formatRelativeTime(props.task.createdAt))

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', props.task.id)
  emit('dragstart', props.task.id)
}
function onDragEnd() {
  emit('dragend', props.task.id)
}
</script>

<template>
  <div
    class="task-card"
    :class="{ starred: task.starred, urgent: task.urgent }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
  >
    <div class="card-header">
      <span v-if="task.category" class="category-tag">{{ task.category }}</span>
      <div class="card-actions">
        <button
          class="icon-btn star-btn"
          :class="{ active: task.starred }"
          :title="task.starred ? '取消星标' : '加星标'"
          @click="emit('toggle-star', task.id)"
        >
          {{ task.starred ? '⭐' : '☆' }}
        </button>
        <button
          class="icon-btn urgent-btn"
          :class="{ active: task.urgent }"
          :title="task.urgent ? '取消紧急' : '标记紧急'"
          @click="emit('toggle-urgent', task.id)"
        >
          {{ task.urgent ? '🔴' : '⚪' }}
        </button>
        <button
          class="icon-btn remove-btn"
          title="删除任务"
          @click="emit('remove', task.id)"
        >
          🗑️
        </button>
      </div>
    </div>

    <div class="card-title">{{ task.title }}</div>
    <div v-if="task.description" class="card-desc">{{ task.description }}</div>

    <div class="card-footer">
      <span class="time">{{ timeText }}</span>
    </div>
  </div>
</template>

<style scoped>
.task-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-3) var(--space-2);
  box-shadow: var(--shadow-sm);
  cursor: grab;
  transition: all var(--transition-fast);
  position: relative;
  overflow: hidden;
}
.task-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  border-color: var(--color-primary);
}
.task-card:active {
  cursor: grabbing;
}
.task-card.starred {
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-primary-light) 100%);
  border-left: 3px solid var(--color-star);
}
.task-card.urgent {
  border-color: var(--color-urgent);
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}
.task-card.urgent::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 18px 18px 0;
  border-color: transparent var(--color-urgent) transparent transparent;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  gap: var(--space-2);
}
.category-tag {
  font-size: var(--font-size-xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 600;
  white-space: nowrap;
}
.card-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.icon-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  font-size: 14px;
  opacity: 0.55;
  transition: all var(--transition-fast);
}
.icon-btn:hover {
  opacity: 1;
  background: var(--color-bg);
}
.icon-btn.active {
  opacity: 1;
}
.star-btn.active {
  animation: pulse 0.4s ease;
}

.card-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: var(--space-1);
  word-break: break-word;
}
.card-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: var(--space-2);
  word-break: break-word;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>