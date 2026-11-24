<script setup>
import { ref } from 'vue'
import NavBar from './components/NavBar.vue'
import KanbanColumn from './components/KanbanColumn.vue'
import AddTaskModal from './components/AddTaskModal.vue'
import FunToast from './components/FunToast.vue'
import Celebration from './components/Celebration.vue'
import { useKanban } from './composables/useKanban'
import { useToast } from './composables/useToast'
import { getRandomMessage } from './config/toastMessages'

const {
  columns,
  tasks,
  tasksByColumn,
  totalCount,
  starredCount,
  urgentCount,
  doneCount,
  existingCategories,
  addTask,
  removeTask,
  toggleStar,
  toggleUrgent,
  moveTask,
  reset
} = useKanban()

const { show, success, error } = useToast()

const modalVisible = ref(false)
const celebrating = ref(false)

function openModal() {
  modalVisible.value = true
}

function onSubmit(task) {
  if (!task.title || !task.title.trim()) {
    error('请填写任务标题')
    return
  }
  addTask(task)
  modalVisible.value = false
  show(getRandomMessage('add'), 'success')
}

function onRemove(id) {
  removeTask(id)
  show(getRandomMessage('remove'), 'info')
}

function onToggleStar(id) {
  const result = toggleStar(id)
  if (result === true) show(getRandomMessage('star'), 'success')
  else if (result === false) show(getRandomMessage('unstar'), 'info')
}

function onToggleUrgent(id) {
  const result = toggleUrgent(id)
  if (result === true) show(getRandomMessage('urgent'), 'error')
  else if (result === false) show(getRandomMessage('unurgent'), 'info')
}

function onMove(taskId, targetColId, index) {
  const task = tasksByColumn.value[targetColId]?.find((t) => t.id === taskId)
  const wasNotDone = !task || task.columnId !== 'done'
  const moved = moveTask(taskId, targetColId, index)
  if (moved) {
    if (targetColId === 'done' && wasNotDone) {
      show(getRandomMessage('done'), 'success')
      celebrating.value = true
    } else {
      show(getRandomMessage('move'), 'info')
    }
  }
}

function onReset() {
  if (tasks.length === 0) {
    show('看板已经是空的了', 'info')
    return
  }
  if (window.confirm('确定要清空所有任务吗？此操作不可撤销。')) {
    reset()
    show(getRandomMessage('reset'), 'info')
  }
}

function onCelebrationComplete() {
  celebrating.value = false
}
</script>

<template>
  <div class="app">
    <NavBar
      :total-count="totalCount"
      :starred-count="starredCount"
      :urgent-count="urgentCount"
      :done-count="doneCount"
      @add-task="openModal"
      @reset="onReset"
    />

    <main class="board">
      <KanbanColumn
        v-for="col in columns"
        :key="col.id"
        :column="col"
        :task-list="tasksByColumn[col.id] || []"
        @move="onMove"
        @toggle-star="onToggleStar"
        @toggle-urgent="onToggleUrgent"
        @remove="onRemove"
        @add-task="openModal"
      />
    </main>

    <AddTaskModal
      :visible="modalVisible"
      :columns="columns"
      :existing-categories="existingCategories"
      @submit="onSubmit"
      @close="modalVisible = false"
    />

    <FunToast />
    <Celebration :visible="celebrating" @complete="onCelebrationComplete" />
  </div>
</template>


<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.board {
  flex: 1;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  align-items: flex-start;
}

@media (max-width: 900px) {
  .board {
    flex-direction: column;
    padding: var(--space-3);
  }
}
</style>