<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CONGESTION_BANDS, congestionBand } from '@/types'
import { fmtInt, fmtDecimal } from '@/utils/format'

const props = defineProps<{
  title: string
  value: number
  unit: string
  decimals?: number
  levelBand?: boolean
}>()

const display = computed(() =>
  props.decimals ? fmtDecimal(props.value, props.decimals) : fmtInt(props.value)
)

const band = computed(() => congestionBand(props.value))
const bandDots = CONGESTION_BANDS

const flashing = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.value,
  () => {
    flashing.value = true
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      flashing.value = false
    }, 420)
  }
)
</script>

<template>
  <div class="kpi-card" :class="{ 'kpi-card--flash': flashing }">
    <div class="kpi-card__title">{{ title }}</div>
    <div class="kpi-card__value" :style="levelBand ? { color: band.color, textShadow: `0 0 14px ${band.color}` } : {}">
      {{ display }}
      <span class="kpi-card__unit">{{ unit }}</span>
    </div>
    <div v-if="levelBand" class="kpi-card__bands">
      <span
        v-for="b in bandDots"
        :key="b.label"
        class="kpi-card__band-dot"
        :class="{ 'kpi-card__band-dot--active': b === band }"
        :style="{ background: b.color }"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.kpi-card {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-inner);
  background: linear-gradient(145deg, rgba(0, 240, 255, 0.06), rgba(138, 43, 226, 0.05));
  border: 1px solid rgba(0, 240, 255, 0.22);
  overflow: hidden;
  transition: box-shadow 0.4s ease;
}

.kpi-card--flash {
  box-shadow: 0 0 16px rgba(0, 240, 255, 0.35);
}

.kpi-card__title {
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--text-muted);
}

.kpi-card__value {
  font-family: var(--font-mono);
  font-size: 30px;
  font-weight: 700;
  color: var(--neon-cyan);
  text-shadow: 0 0 14px rgba(0, 240, 255, 0.45);
  transition: color 0.4s ease, text-shadow 0.4s ease;
}

.kpi-card__unit {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 4px;
}

.kpi-card__bands {
  display: flex;
  gap: 5px;
}

.kpi-card__band-dot {
  width: 18px;
  height: 4px;
  border-radius: 2px;
  opacity: 0.3;
}

.kpi-card__band-dot--active {
  opacity: 1;
  box-shadow: 0 0 6px currentColor;
}
</style>