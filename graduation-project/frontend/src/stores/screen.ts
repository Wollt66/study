import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { Snapshot, RegionAgg, FilterTag, MapScatterItem, VehicleTypeCode } from '@/types'
import { MockEngine } from '@/mock/engine'
import { loadGeo } from '@/services/mapRegistry'
import {
  ENGINE_CONFIG,
  BUILTIN_PROVINCE_CODES,
  BUILTIN_CITY_CODES,
  ACCIDENT_TYPES,
  ACCIDENT_TYPE_MAP,
  VEHICLE_TYPE_MAP,
  provinceName,
  cityName
} from '@/mock/constants'
import { hourFactor, typeHourFactor } from '@/mock/noise'
import type { AccidentRecord } from '@/types'

export interface RankItem {
  intersectionId: string
  intersectionName: string
  cityCode: number
  flowPerHour: number
  congestionLevel: number
}

export interface TypeStatItem {
  typeCode: string
  typeName: string
  count: number
  ratio: number
}

function regionNameOf(code: number): string {
  if (code === 100000) return '全国'
  return cityName(code) !== `城市${code}` ? cityName(code) : provinceName(code)
}

export const useScreenStore = defineStore('screen', () => {
  const snapshot = shallowRef<Snapshot | null>(null)
  const regionStack = ref<number[]>([100000])
  const selectedVehicleType = ref<VehicleTypeCode | null>(null)
  const selectedAccidentType = ref<string | null>(null)
  const paused = ref(false)
  const fullscreen = ref(false)
  const mapMissingTip = ref<string | null>(null)

  let engine: MockEngine | null = null

  const currentRegion = computed<RegionAgg | null>(() => {
    const snap = snapshot.value
    if (!snap) return null
    const code = regionStack.value[regionStack.value.length - 1]
    if (code === 100000) return snap.country
    return (
      snap.provinces.find(p => p.code === code) ??
      snap.cities.find(c => c.code === code) ??
      null
    )
  })

  const scopeCityCodes = computed<Set<number> | null>(() => {
    const snap = snapshot.value
    const stack = regionStack.value
    const top = stack[stack.length - 1]
    if (!snap || top === 100000) return null
    if (stack.length === 2) {
      return new Set(snap.cities.filter(c => c.provinceCode === top).map(c => c.code))
    }
    return new Set([top])
  })

  const scopedAccidents = computed<readonly AccidentRecord[]>(() => {
    const snap = snapshot.value
    if (!snap) return []
    const stack = regionStack.value
    const top = stack[stack.length - 1]
    if (top === 100000) return snap.accidents
    if (stack.length === 2) {
      const citySet = new Set(snap.cities.filter(c => c.provinceCode === top).map(c => c.code))
      return snap.accidents.filter(a => a.regionCode === top || citySet.has(a.regionCode))
    }
    return snap.accidents.filter(a => a.regionCode === top)
  })

  const filteredKpi = computed(() => {
    const region = currentRegion.value
    if (!region) return null
    let activeVehicles = region.activeVehicles
    let avgSpeed = region.avgSpeed
    let accidentCountToday = region.accidentCountToday
    const vt = selectedVehicleType.value
    if (vt) {
      activeVehicles = Math.round(region.vehicleTypes.find(v => v.typeCode === vt)?.activeCount ?? 0)
      avgSpeed = Math.round(avgSpeed * VEHICLE_TYPE_MAP[vt].speedFactor * 10) / 10
    }
    const at = selectedAccidentType.value
    if (at) {
      accidentCountToday = scopedAccidents.value.filter(a => a.accidentType === at).length
    }
    return {
      congestionIndex: region.congestionIndex,
      activeVehicles,
      accidentCountToday,
      avgSpeed
    }
  })

  const filteredIntersections = computed<RankItem[]>(() => {
    const snap = snapshot.value
    if (!snap) return []
    const vt = selectedVehicleType.value
    const scope = scopeCityCodes.value
    let list = snap.intersections
    if (scope) list = list.filter(i => scope.has(i.cityCode))
    const mapped = list.map(i => ({
      intersectionId: i.intersectionId,
      intersectionName: i.intersectionName,
      cityCode: i.cityCode,
      flowPerHour: vt ? Math.round(i.typeFlow[vt]) : i.flowPerHour,
      congestionLevel: i.congestionLevel
    }))
    return mapped.sort((a, b) => b.flowPerHour - a.flowPerHour).slice(0, 10)
  })

  const filteredAccidentTypeStat = computed<TypeStatItem[]>(() => {
    let accidents = scopedAccidents.value
    const vt = selectedVehicleType.value
    if (vt) accidents = accidents.filter(a => a.vehicleType === vt)
    const counts = new Map<string, number>()
    for (const a of accidents) counts.set(a.accidentType, (counts.get(a.accidentType) ?? 0) + 1)
    const total = accidents.length || 1
    return ACCIDENT_TYPES.map(t => ({
      typeCode: t.typeCode,
      typeName: t.typeName,
      count: counts.get(t.typeCode) ?? 0,
      ratio: (counts.get(t.typeCode) ?? 0) / total
    }))
  })

  const filteredVehicleTypeStat = computed(() => currentRegion.value?.vehicleTypes ?? [])

  const filteredCongestionTrend = computed(() => currentRegion.value?.trend ?? [])

  const filteredHourFlow = computed(() => {
    const region = currentRegion.value
    if (!region) return []
    const vt = selectedVehicleType.value
    if (!vt) return region.hourFlow
    const shape = VEHICLE_TYPE_MAP[vt].hourShape
    return region.hourFlow.map(f => ({
      hour: f.hour,
      flow: Math.round((f.flow * typeHourFactor(f.hour, shape)) / (hourFactor(f.hour) || 1))
    }))
  })

  const mapHeatData = computed(() => {
    const snap = snapshot.value
    if (!snap) return []
    const stack = regionStack.value
    const top = stack[stack.length - 1]
    if (top === 100000) {
      return snap.provinces.map(p => ({
        name: p.name,
        value: p.congestionIndex,
        code: p.code,
        metrics: {
          activeVehicles: p.activeVehicles,
          accidentCountToday: p.accidentCountToday,
          avgSpeed: p.avgSpeed
        }
      }))
    }
    if (stack.length === 2) {
      return snap.cities
        .filter(c => c.provinceCode === top)
        .map(c => ({
          name: c.name,
          value: c.congestionIndex,
          code: c.code,
          metrics: {
            activeVehicles: c.activeVehicles,
            accidentCountToday: c.accidentCountToday,
            avgSpeed: c.avgSpeed
          }
        }))
    }
    return []
  })

  const mapScatterData = computed<MapScatterItem[]>(() => {
    let accidents = scopedAccidents.value
    const vt = selectedVehicleType.value
    if (vt) accidents = accidents.filter(a => a.vehicleType === vt)
    const at = selectedAccidentType.value
    if (at) accidents = accidents.filter(a => a.accidentType === at)
    return accidents.map(a => ({
      coord: a.coord,
      accidentType: a.accidentType,
      severity: a.severity,
      vehicleType: a.vehicleType,
      regionName: regionNameOf(a.regionCode)
    }))
  })

  const drillableCodes = computed<number[]>(() => {
    const stack = regionStack.value
    const top = stack[stack.length - 1]
    if (top === 100000) return [...BUILTIN_PROVINCE_CODES]
    if (stack.length === 2) {
      return BUILTIN_CITY_CODES.filter(c => Math.floor(c / 1000) === Math.floor(top / 1000))
    }
    return []
  })

  const filterTags = computed<FilterTag[]>(() => {
    const tags: FilterTag[] = []
    const stack = regionStack.value
    if (stack.length > 1) {
      const top = stack[stack.length - 1]
      tags.push({ dimension: 'region', label: regionNameOf(top), value: String(top) })
    }
    const vt = selectedVehicleType.value
    if (vt) {
      tags.push({
        dimension: 'vehicleType',
        label: VEHICLE_TYPE_MAP[vt].typeName,
        value: vt
      })
    }
    const at = selectedAccidentType.value
    if (at) {
      tags.push({
        dimension: 'accidentType',
        label: ACCIDENT_TYPE_MAP[at]?.typeName ?? at,
        value: at
      })
    }
    return tags
  })

  const currentHour = computed(() => {
    const snap = snapshot.value
    return new Date(snap?.simTime ?? Date.now()).getHours()
  })

  const simClock = computed(() => snapshot.value?.simTime ?? Date.now())

  function applyTick(s: Snapshot): void {
    snapshot.value = s
  }

  function start(): void {
    if (engine) return
    engine = new MockEngine()
    engine.start(applyTick)
  }

  function dispose(): void {
    engine?.dispose()
    engine = null
    snapshot.value = null
  }

  async function drillDown(code: number): Promise<void> {
    if (code === 100000) return
    if (!drillableCodes.value.includes(code)) {
      notifyGeoMissing(regionNameOf(code))
      return
    }
    const ok = await loadGeo(code)
    if (!ok) {
      notifyGeoMissing(regionNameOf(code))
      return
    }
    mapMissingTip.value = null
    regionStack.value = [...regionStack.value, code]
  }

  function notifyGeoMissing(name: string): void {
    const names = drillableCodes.value.map(c => regionNameOf(c))
    mapMissingTip.value = names.length
      ? `${name}暂未收录详细地图，可下钻区域：${names.join('、')}`
      : `${name}已是最细粒度视图`
  }

  function backLevel(): void {
    if (regionStack.value.length > 1) {
      regionStack.value = regionStack.value.slice(0, -1)
    }
  }

  function selectVehicleType(t: VehicleTypeCode): void {
    selectedVehicleType.value = selectedVehicleType.value === t ? null : t
  }

  function selectAccidentType(t: string): void {
    selectedAccidentType.value = selectedAccidentType.value === t ? null : t
  }

  function removeFilter(dimension: FilterTag['dimension']): void {
    if (dimension === 'region') regionStack.value = [100000]
    else if (dimension === 'vehicleType') selectedVehicleType.value = null
    else if (dimension === 'accidentType') selectedAccidentType.value = null
  }

  function togglePause(): void {
    paused.value = !paused.value
    if (paused.value) engine?.pause()
    else engine?.resume()
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch (err) {
      console.warn('[screen] 全屏切换失败', err)
    }
  }

  function setFullscreen(v: boolean): void {
    fullscreen.value = v
  }

  function dismissMapTip(): void {
    mapMissingTip.value = null
  }

  return {
    snapshot,
    regionStack,
    selectedVehicleType,
    selectedAccidentType,
    paused,
    fullscreen,
    mapMissingTip,
    intervalMs: ENGINE_CONFIG.intervalMs,
    accel: ENGINE_CONFIG.accel,
    currentRegion,
    filteredKpi,
    filteredIntersections,
    filteredAccidentTypeStat,
    filteredVehicleTypeStat,
    filteredCongestionTrend,
    filteredHourFlow,
    mapHeatData,
    mapScatterData,
    drillableCodes,
    filterTags,
    currentHour,
    simClock,
    start,
    dispose,
    drillDown,
    backLevel,
    selectVehicleType,
    selectAccidentType,
    removeFilter,
    togglePause,
    toggleFullscreen,
    setFullscreen,
    dismissMapTip
  }
})