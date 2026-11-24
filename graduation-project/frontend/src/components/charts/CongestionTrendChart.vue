<script setup lang="ts">
import { ref } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import { useECharts } from '@/composables/useECharts'
import type { TrendPoint } from '@/types'
import { fmtHourMinute } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    points: TrendPoint[]
  }>(),
  { title: '拥堵指数 24h 滚动趋势' }
)

const chartEl = ref<HTMLElement | null>(null)

const optionFactory = () => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: Array<{ dataIndex: number }>) => {
      const point = props.points[params[0]?.dataIndex]
      if (!point) return ''
      return `${fmtHourMinute(point.time)} · 拥堵指数 <span style="color:#FF2D95;font-weight:700">${point.value.toFixed(2)}</span>`
    }
  },
  grid: { left: 42, right: 18, top: 24, bottom: 30 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.points.map(p => fmtHourMinute(p.time)),
    axisLabel: {
      color: '#9AA7C7',
      fontSize: 10,
      interval: 35,
      formatter: (v: string) => v.slice(0, 2)
    }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 10,
    interval: 2,
    axisLabel: { color: '#9AA7C7', fontSize: 11 }
  },
  series: [
    {
      name: '拥堵指数',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: {
        width: 2,
        color: '#FF2D95',
        shadowBlur: 12,
        shadowColor: 'rgba(255, 45, 149, 0.6)'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255, 45, 149, 0.25)' },
            { offset: 1, color: 'rgba(255, 45, 149, 0)' }
          ]
        }
      },
      data: props.points.map(p => p.value)
    }
  ],
  animationDurationUpdate: 400,
  animationEasingUpdate: 'linear'
})

useECharts(chartEl, {
  optionFactory,
  watchDeps: [() => props.points],
  mergeMode: false
})
</script>

<template>
  <ChartCard :title="title" :subtitle="subtitle ?? '5 分钟粒度滚动窗口'">
    <div ref="chartEl" class="trend-chart"></div>
  </ChartCard>
</template>

<style scoped>
.trend-chart {
  width: 100%;
  height: 100%;
}
</style>