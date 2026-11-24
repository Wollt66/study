<script setup>
import { ref, computed } from 'vue'
import TaskCard from './TaskCard.vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  column: { type: Object, required: true },
  taskList: { type: Array, default: () => [] }
})
const emit = defineEmits(['move', 'toggle-star', 'toggle-urgent', 'remove', 'add-task'])

const dragOver = ref(false)
const dragOverIndex = ref(-1)

const count = computed(() => props.taskList.length)

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOver.value = true
}
function onDragLeave() {
  dragOver.value = false
  dragOverIndex.value = -1
}
function onDrop(e) {
  e.preventDefault()
  dragOver.value = false
  dragOverIndex.value = -1
  const taskId = e.dataTransfer.getData('text/plain')
  if (!taskId) return
  emit('move', taskId, props.column.id, -1)
}
</script>

<template>
  <section
    class="kanban-column"
    :class="{ 'drag-over': dragOver }"
    :style="{ '--col-color': column.color }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <header class="column-header">
      <span class="column-dot"></span>
      <h2 class="column-title">{{ column.title }}</h2>
      <span class="column-count">{{ count }}</span>
    </header>

    <div class="column-body">
      <TaskCard
        v-for="task in taskList"
        :key="task.id"
        :task="task"
        @toggle-star="(id) => emit('toggle-star', id)"
        @toggle-urgent="(id) => emit('toggle-urgent', id)"
        @remove="(id) => emit('remove', id)"
      />
      <EmptyState
        v-if="count === 0"
        :icon="column.id === 'todo' ? '📝' : column.id === 'doing' ? '⏳' : '🎉'"
        :title="column.id === 'todo' ? '还没有待办' : column.id === 'doing' ? '没有进行中的任务' : '尚未完成任何任务'"
        :hint="column.id === 'done' ? '完成任务后会出现在这里' : '拖拽任务到此处'"
        :action-text="column.id === 'todo' ? '新增任务' : ''"
        @action="emit('add-task')"
      />
    </div>
  </section>
</template>

<style scoped>
.kanban-column {
  flex: 1 1 0;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
  overflow: hidden;
}
.kanban-column.drag-over {
  border-color: var(--col-color);
  box-shadow: 0 0 0 2px var(--col-color), var(--shadow-md);
  background: var(--color-surface);
}
.column-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(135deg, transparent 0%, color-mix(in srgb, var(--col-color) 8%, transparent) 100%);
}
.column-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--col-color);
  box-shadow: 0 0 8px var(--col-color);
}
.column-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}
.column-count {
  margin-left: auto;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.column-body {
  flex: 1;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 120px;
}

@media (max-width: 900px) {
  .kanban-column {
    min-width: 100%;
  }
}
</style>