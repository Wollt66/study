<script setup lang="ts">
import { ref } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import { useECharts } from '@/composables/useECharts'
import { NEON_COLORS } from '@/chart/theme'

export interface TypeStatItem {
  typeCode: string
  typeName: string
  count: number
  ratio: number
}

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    items: TypeStatItem[]
    selectedType: string | null
  }>(),
  { title: '事故类型分布' }
)

const emit = defineEmits<{
  (e: 'type-select', payload: { typeCode: string }): void
}>()

const chartEl = ref<HTMLElement | null>(null)

const optionFactory = () => ({
  tooltip: {
    trigger: 'item',
    formatter: (p: { name: string; value: number; percent: number }) =>
      `<div style="font-weight:700;margin-bottom:4px">${p.name}</div>` +
      `活跃事故：<span style="color:#FF2D95;font-weight:700">${p.value}</span> 起<br/>` +
      `占比：${p.percent}%`
  },
  series: [
    {
      name: '事故类型',
      type: 'pie',
      roseType: 'radius',
      radius: ['18%', '78%'],
      center: ['50%', '54%'],
      selectedMode: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#050816',
        borderWidth: 2
      },
      label: {
        color: '#C8D4F0',
        fontSize: 11,
        formatter: '{b}\n{d}%'
      },
      labelLine: {
        length: 8,
        length2: 8,
        lineStyle: { color: 'rgba(0,240,255,0.4)' }
      },
      data: props.items.map((item, idx) => {
        const active = props.selectedType === item.typeCode
        return {
          name: item.typeName,
          value: item.count,
          typeCode: item.typeCode,
          itemStyle: {
            color: NEON_COLORS[idx % NEON_COLORS.length],
            opacity: props.selectedType && !active ? 0.35 : 1,
            shadowBlur: active ? 16 : 0,
            shadowColor: NEON_COLORS[idx % NEON_COLORS.length]
          },
          label: { fontWeight: active ? 700 : 400 }
        }
      }),
      emphasis: {
        scale: true,
        scaleSize: 6
      }
    }
  ],
  animationDurationUpdate: 400,
  animationEasingUpdate: 'cubicInOut'
})

const onChartClick = (params: any) => {
  if (params?.seriesType !== 'pie' || !params.data?.typeCode) return
  emit('type-select', { typeCode: params.data.typeCode as string })
}

useECharts(chartEl, {
  optionFactory,
  watchDeps: [() => props.items, () => props.selectedType],
  mergeMode: false,
  onChartClick
})
</script>

<template>
  <ChartCard :title="title" :subtitle="subtitle ?? '点击扇区联动过滤'">
    <div ref="chartEl" class="pie-chart"></div>
  </ChartCard>
</template>

<style scoped>
.pie-chart {
  width: 100%;
  height: 100%;
}
</style>