<script setup lang="ts">
import { computed, ref } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import { useECharts } from '@/composables/useECharts'
import { NEON_COLORS } from '@/chart/theme'
import { fmtInt } from '@/utils/format'
import type { VehicleTypeCode, VehicleTypeStat } from '@/types'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    items: VehicleTypeStat[]
    selectedType: VehicleTypeCode | null
    total: number
  }>(),
  { title: '在途车辆类型占比' }
)

const emit = defineEmits<{
  (e: 'type-select', payload: { typeCode: VehicleTypeCode }): void
}>()

const chartEl = ref<HTMLElement | null>(null)

const optionFactory = () => ({
  tooltip: {
    trigger: 'item',
    formatter: (p: { name: string; value: number; percent: number }) =>
      `<div style="font-weight:700;margin-bottom:4px">${p.name}</div>` +
      `在途数量：<span style="color:#00F0FF;font-weight:700">${fmtInt(p.value)}</span> 辆<br/>` +
      `占比：${p.percent}%`
  },
  series: [
    {
      name: '车辆类型',
      type: 'pie',
      radius: ['52%', '74%'],
      center: ['32%', '52%'],
      selectedMode: false,
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#050816',
        borderWidth: 2
      },
      label: { show: false },
      data: props.items.map((item, idx) => {
        const active = props.selectedType === item.typeCode
        return {
          name: item.typeName,
          value: Math.round(item.activeCount),
          typeCode: item.typeCode,
          itemStyle: {
            color: NEON_COLORS[idx % NEON_COLORS.length],
            opacity: props.selectedType && !active ? 0.35 : 1,
            shadowBlur: active ? 16 : 0,
            shadowColor: NEON_COLORS[idx % NEON_COLORS.length]
          }
        }
      }),
      emphasis: { scale: true, scaleSize: 5 }
    }
  ],
  animationDurationUpdate: 400,
  animationEasingUpdate: 'cubicInOut'
})

const onChartClick = (params: any) => {
  if (params?.seriesType !== 'pie' || !params.data?.typeCode) return
  emit('type-select', { typeCode: params.data.typeCode as VehicleTypeCode })
}

useECharts(chartEl, {
  optionFactory,
  watchDeps: [() => props.items, () => props.selectedType],
  mergeMode: false,
  onChartClick
})

const legendItems = computed(() =>
  props.items.map((item, idx) => ({
    ...item,
    color: NEON_COLORS[idx % NEON_COLORS.length],
    active: props.selectedType === item.typeCode
  }))
)

const onLegendClick = (typeCode: VehicleTypeCode): void => {
  emit('type-select', { typeCode })
}
</script>

<template>
  <ChartCard :title="title" :subtitle="subtitle ?? '点击图例/扇区联动过滤'">
    <div class="ring-wrap">
      <div ref="chartEl" class="ring-chart"></div>
      <div class="ring-legend">
        <div
          v-for="item in legendItems"
          :key="item.typeCode"
          class="ring-legend__item"
          :class="{ 'ring-legend__item--active': item.active }"
          @click="onLegendClick(item.typeCode)"
        >
          <span class="ring-legend__dot" :style="{ background: item.color, boxShadow: item.active ? `0 0 8px ${item.color}` : 'none' }"></span>
          <span class="ring-legend__name">{{ item.typeName }}</span>
          <span class="ring-legend__value">{{ fmtInt(item.activeCount) }}</span>
          <span class="ring-legend__ratio">{{ (item.ratio * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </ChartCard>
</template>

<style scoped>
.ring-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.ring-chart {
  position: absolute;
  inset: 0;
}

.ring-legend {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ring-legend__item {
  display: grid;
  grid-template-columns: 10px 52px 64px 48px;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: var(--radius-inner);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.25s ease;
  opacity: 0.75;
}

.ring-legend__item:hover {
  opacity: 1;
  background: rgba(0, 240, 255, 0.06);
}

.ring-legend__item--active {
  opacity: 1;
  border-color: rgba(0, 240, 255, 0.5);
  background: rgba(0, 240, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
}

.ring-legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.ring-legend__name {
  font-size: 12px;
  color: var(--text-secondary);
}

.ring-legend__value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--neon-cyan);
  text-align: right;
}

.ring-legend__ratio {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}
</style>