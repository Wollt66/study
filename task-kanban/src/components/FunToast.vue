<script setup>
import { useToast } from '../composables/useToast'

const { toasts, remove } = useToast()
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.type}`"
        @mouseenter="() => {}"
      >
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" @click="remove(t.id)">✕</button>
        <div class="toast-progress"></div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-5);
  right: var(--space-5);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  min-width: 220px;
  max-width: 360px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  position: relative;
  overflow: hidden;
  animation: slideDown 0.25s ease;
}
.toast-success { border-left: 3px solid var(--color-success); }
.toast-error { border-left: 3px solid var(--color-danger); }
.toast-info { border-left: 3px solid var(--color-primary); }
.toast-msg {
  flex: 1;
  font-size: var(--font-size-base);
  color: var(--color-text);
}
.toast-close {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: var(--color-text-muted);
  font-size: 11px;
}
.toast-close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}
.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--color-primary);
  animation: shrink 2.6s linear forwards;
}
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}
</style>