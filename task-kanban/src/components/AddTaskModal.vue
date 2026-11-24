<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  columns: { type: Array, default: () => [] },
  existingCategories: { type: Array, default: () => [] }
})
const emit = defineEmits(['submit', 'close'])

const title = ref('')
const description = ref('')
const category = ref('')
const columnId = ref('todo')
const showCategorySuggest = ref(false)
const titleInputRef = ref(null)

const canSubmit = computed(() => title.value.trim().length > 0)

const matchedCategories = computed(() => {
  const v = category.value.trim().toLowerCase()
  if (!v) return []
  return props.existingCategories.filter((c) => c.toLowerCase().includes(v) && c.toLowerCase() !== v).slice(0, 5)
})

watch(() => props.visible, async (v) => {
  if (v) {
    title.value = ''
    description.value = ''
    category.value = ''
    columnId.value = 'todo'
    await nextTick()
    titleInputRef.value?.focus()
  }
})

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    title: title.value,
    description: description.value,
    category: category.value,
    columnId: columnId.value
  })
}

function close() {
  emit('close')
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) close()
}

function pickCategory(c) {
  category.value = c
  showCategorySuggest.value = false
}
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="modal-overlay" @click="onOverlayClick">
      <transition name="modal" appear>
        <div v-if="visible" class="modal-card">
          <header class="modal-header">
            <h3>新增任务</h3>
            <button class="close-btn" @click="close">✕</button>
          </header>

          <form class="modal-body" @submit.prevent="submit">
            <div class="field">
              <input
                ref="titleInputRef"
                v-model="title"
                type="text"
                placeholder=" "
                id="task-title"
                autocomplete="off"
              />
              <label for="task-title">标题 *</label>
            </div>

            <div class="field">
              <textarea
                v-model="description"
                placeholder=" "
                id="task-desc"
                rows="3"
              ></textarea>
              <label for="task-desc">描述（可选）</label>
            </div>

            <div class="field suggest-wrap">
              <input
                v-model="category"
                type="text"
                placeholder=" "
                id="task-category"
                autocomplete="off"
                @focus="showCategorySuggest = true"
                @blur="setTimeout(() => showCategorySuggest = false, 200)"
              />
              <label for="task-category">分类（可选）</label>
              <ul v-if="showCategorySuggest && matchedCategories.length" class="suggest-list">
                <li v-for="c in matchedCategories" :key="c" @mousedown.prevent="pickCategory(c)">{{ c }}</li>
              </ul>
            </div>

            <div class="field">
              <select v-model="columnId" id="task-col">
                <option v-for="col in columns" :key="col.id" :value="col.id">{{ col.title }}</option>
              </select>
              <label for="task-col">目标列</label>
            </div>

            <footer class="modal-footer">
              <button type="button" class="btn ghost" @click="close">取消</button>
              <button type="submit" class="btn primary" :disabled="!canSubmit">添加</button>
            </footer>
          </form>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
}
.modal-card {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
  font-size: var(--font-size-xl);
  font-weight: 700;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  font-size: 16px;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}
.close-btn:hover {
  background: var(--color-bg);
  color: var(--color-danger);
}
.modal-body {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.field {
  position: relative;
}
.field input,
.field textarea,
.field select {
  width: 100%;
  padding: var(--space-3) var(--space-3) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color var(--transition-fast);
  resize: vertical;
}
.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
.field label {
  position: absolute;
  left: var(--space-3);
  top: var(--space-3);
  color: var(--color-text-muted);
  pointer-events: none;
  transition: all var(--transition-fast);
  background: var(--color-bg-elevated);
  padding: 0 4px;
}
.field input:focus + label,
.field input:not(:placeholder-shown) + label,
.field textarea:focus + label,
.field textarea:not(:placeholder-shown) + label,
.field select:focus + label,
.field select:valid + label {
  top: -8px;
  font-size: var(--font-size-xs);
  color: var(--color-primary);
}

.suggest-wrap {
  position: relative;
}
.suggest-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 10;
  max-height: 160px;
  overflow-y: auto;
}
.suggest-list li {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.suggest-list li:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.btn {
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: var(--font-size-base);
  transition: all var(--transition-fast);
}
.btn.primary {
  background: var(--color-primary);
  color: #fff;
}
.btn.primary:hover {
  background: var(--color-primary-hover);
}
.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.btn.ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>