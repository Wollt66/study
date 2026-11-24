<script setup lang="ts">
import { ref } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import { useECharts } from '@/composables/useECharts'
import { NEON_COLORS } from '@/chart/theme'
import { fmtInt } from '@/utils/format'

interface RankItem {
  intersectionId: string
  intersectionName: string
  cityCode: number
  flowPerHour: number
  congestionLevel: number
}

const props = defineProps<{
  title?: string
  subtitle?: string
  items: RankItem[]
}>()

const emit = defineEmits<{
  (e: 'item-click', payload: RankItem): void
}>()

const chartEl = ref<HTMLElement | null>(null)
const selectedId = ref<string | null>(null)

const optionFactory = () => {
  const sorted = [...props.items].sort((a, b) => b.flowPerHour - a.flowPerHour)
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const item = sorted[params[0]?.dataIndex]
        if (!item) return ''
        return (
          `<div style="font-weight:700;margin-bottom:4px">${item.intersectionName}</div>` +
          `小时流量：<span style="color:#00F0FF;font-weight:700">${fmtInt(item.flowPerHour)}</span> 辆<br/>` +
          `路口拥堵：${item.congestionLevel.toFixed(1)}`
        )
      }
    },
    grid: { left: 148, right: 40, top: 8, bottom: 8 },
    xAxis: {
      type: 'value',
      splitNumber: 3,
      axisLabel: { color: '#9AA7C7', fontSize: 11, formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)) }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      axisLabel: {
        color: '#C8D4F0',
        fontSize: 11,
        width: 132,
        overflow: 'truncate',
        formatter: (name: string, index: number) => `${index + 1}. ${name}`
      }
    },
    series: [
      {
        name: '小时流量',
        type: 'bar',
        barWidth: 12,
        data: sorted.map((item, idx) => ({
          value: item.flowPerHour,
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: idx < 3 ? NEON_COLORS[1] : NEON_COLORS[0] },
                { offset: 1, color: idx < 3 ? 'rgba(255,45,149,0.25)' : 'rgba(0,240,255,0.25)' }
              ]
            },
            opacity: selectedId.value && selectedId.value !== item.intersectionId ? 0.35 : 1
          }
        })),
        label: {
          show: true,
          position: 'right',
          color: '#9AA7C7',
          fontSize: 11,
          formatter: (p: { value: number }) => fmtInt(p.value)
        }
      }
    ],
    animationDurationUpdate: 400,
    animationEasingUpdate: 'cubicInOut'
  }
}

const onChartClick = (params: { seriesType: string; dataIndex?: number }) => {
  if (params.seriesType !== 'bar') return
  const sorted = [...props.items].sort((a, b) => b.flowPerHour - a.flowPerHour)
  const item = sorted[params.dataIndex ?? -1]
  if (!item) return
  selectedId.value = selectedId.value === item.intersectionId ? null : item.intersectionId
  emit('item-click', item)
}

useECharts(chartEl, {
  optionFactory,
  watchDeps: [() => props.items],
  mergeMode: false,
  onChartClick
})
</script>

<template>
  <ChartCard :title="title ?? '路口流量 TOP10'" :subtitle="subtitle">
    <div ref="chartEl" class="rank-chart"></div>
  </ChartCard>
</template>

<style scoped>
.rank-chart {
  width: 100%;
  height: 100%;
}
</style>