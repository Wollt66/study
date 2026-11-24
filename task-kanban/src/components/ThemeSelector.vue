<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useTheme } from '../composables/useTheme'

const { current, themes, themeOrder, setTheme, previewTheme, cancelPreview } = useTheme()

const open = ref(false)
const wrapperRef = ref(null)

function toggle() {
  open.value = !open.value
}

function onSelect(name) {
  setTheme(name)
  open.value = false
}

function onOutsideClick(e) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) {
    open.value = false
    cancelPreview()
  }
}

onMounted(() => document.addEventListener('click', onOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', onOutsideClick))
</script>

<template>
  <div class="theme-selector" ref="wrapperRef">
    <button class="theme-trigger" @click="toggle" title="切换主题">
      <span class="icon">{{ themes[current]?.icon || '🎨' }}</span>
    </button>
    <transition name="slide-up">
      <ul v-if="open" class="theme-menu">
        <li
          v-for="name in themeOrder"
          :key="name"
          class="theme-item"
          :class="{ active: name === current }"
          @mouseenter="previewTheme(name)"
          @mouseleave="cancelPreview"
          @click="onSelect(name)"
        >
          <span class="icon">{{ themes[name].icon }}</span>
          <span class="label">{{ themes[name].name }}</span>
          <span v-if="name === current" class="check">✓</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<style scoped>
.theme-selector {
  position: relative;
}
.theme-trigger {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: 18px;
  transition: all var(--transition-fast);
}
.theme-trigger:hover {
  transform: rotate(15deg) scale(1.1);
  border-color: var(--color-primary);
}
.theme-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 140px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1);
  z-index: var(--z-dropdown);
}
.theme-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-base);
  transition: background var(--transition-fast);
}
.theme-item:hover {
  background: var(--color-primary-light);
}
.theme-item.active {
  color: var(--color-primary);
  font-weight: 600;
}
.theme-item .icon {
  font-size: 16px;
}
.theme-item .check {
  margin-left: auto;
  color: var(--color-primary);
}
</style>