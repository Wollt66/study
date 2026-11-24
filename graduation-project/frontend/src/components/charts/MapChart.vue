<script setup lang="ts">
import { computed, ref } from 'vue'
import ChartCard from '@/components/ChartCard.vue'
import { useECharts } from '@/composables/useECharts'
import { CONGESTION_BANDS, congestionBand, type MapScatterItem } from '@/types'
import { SEVERITIES, SEVERITY_MAP, ACCIDENT_TYPE_MAP, VEHICLE_TYPE_MAP } from '@/mock/constants'
import { fmtInt } from '@/utils/format'

export interface MapHeatItem {
  name: string
  value: number
  code?: number
  metrics?: {
    activeVehicles: number
    accidentCountToday: number
    avgSpeed: number
  }
}

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    mapName: string
    heatData: MapHeatItem[]
    scatterData: MapScatterItem[]
    level: 'country' | 'province' | 'city'
  }>(),
  { title: '交通态势地图', subtitle: '' }
)

const emit = defineEmits<{
  (e: 'region-click', payload: { code: number; name: string }): void
  (e: 'back'): void
}>()

const chartEl = ref<HTMLElement | null>(null)

const canBack = computed(() => props.level !== 'country')

const accidentNameOf = (t: string) => ACCIDENT_TYPE_MAP[t]?.typeName ?? t
const vehicleNameOf = (t: string) => VEHICLE_TYPE_MAP[t as keyof typeof VEHICLE_TYPE_MAP]?.typeName ?? t

const buildScatterItems = (severity: 'minor' | 'moderate') =>
  props.scatterData
    .filter(item => item.severity === severity)
    .map(item => ({
      name: `${item.regionName} · ${accidentNameOf(item.accidentType)}`,
      value: [item.coord[0], item.coord[1], 1],
      severity: item.severity,
      accidentType: item.accidentType,
      vehicleType: item.vehicleType,
      regionName: item.regionName
    }))

const buildEffectItems = () =>
  props.scatterData
    .filter(item => item.severity === 'severe')
    .map(item => ({
      name: `${item.regionName} · ${accidentNameOf(item.accidentType)}`,
      value: [item.coord[0], item.coord[1], 1],
      severity: item.severity,
      accidentType: item.accidentType,
      vehicleType: item.vehicleType,
      regionName: item.regionName
    }))

const severityColor = (severity: string) =>
  SEVERITY_MAP[severity as keyof typeof SEVERITY_MAP]?.color ?? '#FFB800'

const optionFactory = () => ({
  tooltip: {
    trigger: 'item',
    formatter: (params: any) => {
      const d = params?.data
      if (params.seriesType === 'map' && d && typeof d.value === 'number') {
        const band = congestionBand(d.value)
        return (
          `<div style="font-weight:700;margin-bottom:4px">${params.name}</div>` +
          `拥堵指数：<span style="color:${band.color};font-weight:700">${d.value.toFixed(1)} ${band.label}</span><br/>` +
          `在途车辆：${fmtInt(d.metrics?.activeVehicles ?? 0)}<br/>` +
          `今日事故：${d.metrics?.accidentCountToday ?? 0} 起<br/>` +
          `平均车速：${(d.metrics?.avgSpeed ?? 0).toFixed(1)} km/h`
        )
      }
      if (d && d.severity) {
        return (
          `<div style="font-weight:700;margin-bottom:4px">${SEVERITY_MAP[d.severity as 'minor']?.name ?? ''}事故 · ${accidentNameOf(String(d.accidentType))}</div>` +
          `区域：${d.regionName}<br/>涉事车辆：${vehicleNameOf(String(d.vehicleType))}`
        )
      }
      return params.name
    }
  },
  visualMap: {
    type: 'piecewise',
    left: 18,
    bottom: 16,
    itemWidth: 12,
    itemHeight: 8,
    textStyle: { color: '#9AA7C7', fontSize: 11 },
    pieces: CONGESTION_BANDS.map(b => ({
      min: b.min,
      max: b.max,
      label: b.label,
      color: b.color
    }))
  },
  geo: {
    map: props.mapName,
    roam: false,
    zoom: 1.08,
    layoutCenter: ['50%', '52%'],
    layoutSize: '88%',
    itemStyle: {
      areaColor: 'rgba(18, 28, 58, 0.9)',
      borderColor: 'rgba(0, 240, 255, 0.55)',
      borderWidth: 1,
      shadowColor: 'rgba(0, 240, 255, 0.28)',
      shadowBlur: 14
    },
    emphasis: {
      label: { color: '#FFFFFF', fontSize: 12 },
      itemStyle: { areaColor: 'rgba(0, 240, 255, 0.28)' }
    }
  },
  series: [
    {
      name: '拥堵指数',
      type: 'map',
      geoIndex: 0,
      data: props.heatData
    },
    {
      name: '一般事故',
      type: 'scatter',
      coordinateSystem: 'geo',
      geoIndex: 0,
      symbolSize: 7,
      itemStyle: { opacity: 0.75 },
      data: buildScatterItems('minor').map(item => ({
        ...item,
        itemStyle: { color: severityColor('minor') }
      }))
    },
    {
      name: '较重事故',
      type: 'scatter',
      coordinateSystem: 'geo',
      geoIndex: 0,
      symbolSize: 11,
      itemStyle: { opacity: 0.85 },
      data: buildScatterItems('moderate').map(item => ({
        ...item,
        itemStyle: { color: severityColor('moderate') }
      }))
    },
    {
      name: '严重事故',
      type: 'effectScatter',
      coordinateSystem: 'geo',
      geoIndex: 0,
      symbolSize: 15,
      rippleEffect: { brushType: 'stroke', scale: 2.8, period: 4 },
      data: buildEffectItems().map(item => ({
        ...item,
        itemStyle: { color: severityColor('severe'), shadowBlur: 10, shadowColor: severityColor('severe') }
      }))
    }
  ],
  animationDurationUpdate: 400,
  animationEasingUpdate: 'cubicInOut'
})

const onChartClick = (params: any) => {
  if (params?.seriesType !== 'map') return
  const d = params.data as MapHeatItem | undefined
  if (!d || d.code === undefined) return
  emit('region-click', { code: d.code, name: params.name })
}

useECharts(chartEl, {
  optionFactory,
  watchDeps: [() => props.mapName, () => props.heatData, () => props.scatterData],
  mergeMode: true,
  onChartClick
})
</script>

<template>
  <ChartCard :title="title" :subtitle="subtitle">
    <template #extra>
      <button v-if="canBack" class="map-back" @click="emit('back')">‹ 返回上一级</button>
    </template>
    <div ref="chartEl" class="map-chart"></div>
  </ChartCard>
</template>

<style scoped>
.map-chart {
  width: 100%;
  height: 100%;
}

.map-back {
  font-family: var(--font-body);
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--neon-magenta);
  background: rgba(255, 45, 149, 0.1);
  border: 1px solid rgba(255, 45, 149, 0.5);
  border-radius: var(--radius-tag);
  padding: 3px 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.map-back:hover {
  background: rgba(255, 45, 149, 0.22);
  box-shadow: 0 0 10px rgba(255, 45, 149, 0.4);
}
</style>