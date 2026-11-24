import { ref, computed, watch } from 'vue'
import { loadState, saveState, clearState, generateId } from '../utils/storage.js'

const defaultColumns = [
  { id: 'todo', title: '待办', color: 'var(--color-todo)' },
  { id: 'doing', title: '进行中', color: 'var(--color-doing)' },
  { id: 'done', title: '已完成', color: 'var(--color-done)' }
]

function createDefaultTasks() {
  const now = Date.now()
  return [
    {
      id: generateId(),
      title: '欢迎使用任务看板',
      description: '拖拽卡片可在列之间流转，点击星标/紧急按钮标记任务',
      category: '示例',
      columnId: 'todo',
      starred: true,
      urgent: false,
      createdAt: now
    },
    {
      id: generateId(),
      title: '体验主题切换',
      description: '右上角可切换亮色/暗色/多彩主题',
      category: '示例',
      columnId: 'doing',
      starred: false,
      urgent: false,
      createdAt: now - 60000
    },
    {
      id: generateId(),
      title: '完成第一个任务',
      description: '试试把这个任务拖到"已完成"列，会有庆祝动画哦',
      category: '示例',
      columnId: 'done',
      starred: false,
      urgent: false,
      createdAt: now - 120000
    }
  ]
}

export function useKanban() {
  const persisted = loadState()

  const columns = ref(persisted?.columns?.length ? persisted.columns : defaultColumns)
  const tasks = ref(persisted?.tasks?.length ? persisted.tasks : (persisted ? [] : createDefaultTasks()))

  const tasksByColumn = computed(() => {
    const map = {}
    for (const col of columns.value) {
      map[col.id] = tasks.value.filter((t) => t.columnId === col.id)
    }
    return map
  })

  const totalCount = computed(() => tasks.value.length)
  const starredCount = computed(() => tasks.value.filter((t) => t.starred).length)
  const urgentCount = computed(() => tasks.value.filter((t) => t.urgent).length)
  const doneCount = computed(() => tasks.value.filter((t) => t.columnId === 'done').length)

  const existingCategories = computed(() => {
    const set = new Set()
    for (const t of tasks.value) {
      if (t.category) set.add(t.category)
    }
    return Array.from(set)
  })

  function persist() {
    saveState({ columns: columns.value, tasks: tasks.value })
  }

  watch([columns, tasks], persist, { deep: true })

  function addTask(task) {
    const newTask = {
      id: generateId(),
      title: task.title.trim(),
      description: (task.description || '').trim(),
      category: (task.category || '').trim(),
      columnId: task.columnId || 'todo',
      starred: false,
      urgent: false,
      createdAt: Date.now()
    }
    tasks.value.push(newTask)
    return newTask
  }

  function removeTask(id) {
    const idx = tasks.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      tasks.value.splice(idx, 1)
      return true
    }
    return false
  }

  function toggleStar(id) {
    const t = tasks.value.find((x) => x.id === id)
    if (t) {
      t.starred = !t.starred
      return t.starred
    }
    return null
  }

  function toggleUrgent(id) {
    const t = tasks.value.find((x) => x.id === id)
    if (t) {
      t.urgent = !t.urgent
      return t.urgent
    }
    return null
  }

  function moveTask(taskId, targetColumnId, targetIndex = -1) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false
    const oldColumnId = task.columnId
    task.columnId = targetColumnId

    if (targetIndex >= 0 && oldColumnId !== targetColumnId) {
      const sameColTasks = tasks.value
        .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
      sameColTasks.splice(targetIndex, 0, task)
      const orderedIds = new Set(sameColTasks.map((t) => t.id))
      const others = tasks.value.filter((t) => !orderedIds.has(t.id) || t.id === taskId)
      const reordered = []
      let inserted = false
      for (const t of tasks.value) {
        if (t.id === taskId) continue
        if (t.columnId !== targetColumnId) {
          reordered.push(t)
        }
      }
      reordered.push(...sameColTasks)
      tasks.value = reordered
    }
    return oldColumnId !== targetColumnId
  }

  function reset() {
    tasks.value = []
    clearState()
  }

  return {
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
  }
}