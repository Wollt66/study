<script setup lang="ts">
import { ref } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import { useECharts } from '@/composables/useECharts'
import { fmtInt } from '@/utils/format'
import type { HourFlow } from '@/types'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    hours: HourFlow[]
    currentHour: number
  }>(),
  { title: '24 小时分时流量热力' }
)

const chartEl = ref<HTMLElement | null>(null)

const optionFactory = () => {
  const maxFlow = Math.max(...props.hours.map(h => h.flow), 1)
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { data: [number, number, number] }) => {
        const [hour, , flow] = p.data
        return `${String(hour).padStart(2, '0')}:00 时段 · 流量 <span style="color:#00F0FF;font-weight:700">${fmtInt(flow)}</span> 辆`
      }
    },
    visualMap: {
      type: 'continuous',
      min: 0,
      max: maxFlow,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 12,
      itemHeight: 90,
      textStyle: { color: '#9AA7C7', fontSize: 11 },
      formatter: (v: number) => (v >= 10000 ? `${Math.round(v / 10000)}w` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))),
      inRange: {
        color: ['rgba(0, 240, 255, 0.08)', '#00F0FF', '#8A2BE2', '#FF2D95']
      }
    },
    grid: { left: 18, right: 18, top: 14, bottom: 40 },
    xAxis: {
      type: 'category',
      data: props.hours.map(h => `${String(h.hour).padStart(2, '0')}`),
      axisLabel: { color: '#9AA7C7', fontSize: 10, interval: 0 },
      splitArea: { show: false }
    },
    yAxis: {
      type: 'category',
      data: ['流量'],
      axisLabel: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: '分时流量',
        type: 'heatmap',
        barWidth: '96%',
        data: props.hours.map(h => ({
          value: [h.hour, 0, h.flow],
          itemStyle:
            h.hour === props.currentHour
              ? {
                  borderColor: '#00FFA3',
                  borderWidth: 2,
                  borderRadius: 5,
                  shadowBlur: 10,
                  shadowColor: 'rgba(0, 255, 163, 0.8)'
                }
              : { borderRadius: 5 }
        })),
        label: {
          show: true,
          position: 'inside',
          color: 'rgba(232, 240, 255, 0.85)',
          fontSize: 10,
          formatter: (p: { data: [number, number, number] }) =>
            p.data[2] >= maxFlow * 0.45 ? `${Math.round(p.data[2] / 1000)}k` : ''
        }
      }
    ],
    animationDurationUpdate: 400,
    animationEasingUpdate: 'cubicInOut'
  }
}

useECharts(chartEl, {
  optionFactory,
  watchDeps: [() => props.hours, () => props.currentHour],
  mergeMode: false
})
</script>

<template>
  <ChartCard :title="title" :subtitle="subtitle ?? '绿色描边为当前模拟时段'">
    <div ref="chartEl" class="heat-chart"></div>
  </ChartCard>
</template>

<style scoped>
.heat-chart {
  width: 100%;
  height: 100%;
}
</style>