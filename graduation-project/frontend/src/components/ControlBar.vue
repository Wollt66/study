<script setup lang="ts">
defineProps<{
  paused: boolean
  fullscreen: boolean
  intervalMs: number
  accel: number
}>()

const emit = defineEmits<{
  (e: 'toggle-pause'): void
  (e: 'toggle-fullscreen'): void
}>()
</script>

<template>
  <div class="control-bar">
    <button
      class="control-bar__btn"
      :class="{ 'control-bar__btn--paused': paused }"
      @click="emit('toggle-pause')"
    >
      {{ paused ? '▶ 恢复刷新' : '❚❚ 暂停刷新' }}
    </button>
    <button class="control-bar__btn" @click="emit('toggle-fullscreen')">
      {{ fullscreen ? '⤡ 退出全屏' : '⤢ 进入全屏' }}
    </button>
    <span class="control-bar__meta">
      <span class="control-bar__dot" :class="{ 'control-bar__dot--paused': paused }"></span>
      {{ paused ? '数据已冻结' : `实时刷新 ${intervalMs / 1000}s · 模拟加速 ×${accel}` }}
    </span>
  </div>
</template>

<style scoped>
.control-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
}

.control-bar__btn {
  font-family: var(--font-body);
  font-size: 13px;
  letter-spacing: 1px;
  color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.08);
  border: 1px solid rgba(0, 240, 255, 0.45);
  border-radius: var(--radius-tag);
  padding: 5px 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.control-bar__btn:hover {
  background: rgba(0, 240, 255, 0.18);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.35);
}

.control-bar__btn--paused {
  color: var(--neon-amber);
  border-color: rgba(255, 184, 0, 0.55);
  background: rgba(255, 184, 0, 0.1);
}

.control-bar__btn--paused:hover {
  background: rgba(255, 184, 0, 0.2);
  box-shadow: 0 0 12px rgba(255, 184, 0, 0.35);
}

.control-bar__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.control-bar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--neon-green);
  box-shadow: 0 0 8px var(--neon-green);
  animation: control-pulse 2s ease-in-out infinite;
}

.control-bar__dot--paused {
  background: var(--neon-amber);
  box-shadow: 0 0 8px var(--neon-amber);
  animation: none;
}

@keyframes control-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>