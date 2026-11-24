<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fmtClock, fmtDate } from '@/utils/format'

const clock = ref('')
const date = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const tick = (): void => {
  const now = Date.now()
  clock.value = fmtClock(now)
  date.value = fmtDate(now)
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="time-clock">
    <div class="time-clock__clock">{{ clock }}</div>
    <div class="time-clock__date">{{ date }}</div>
  </div>
</template>

<style scoped>
.time-clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
  user-select: none;
}

.time-clock__clock {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 700;
  color: var(--neon-cyan);
  text-shadow: 0 0 12px rgba(0, 240, 255, 0.5);
  letter-spacing: 2px;
}

.time-clock__date {
  font-size: 13px;
  color: var(--text-muted);
  letter-spacing: 1px;
}
</style>