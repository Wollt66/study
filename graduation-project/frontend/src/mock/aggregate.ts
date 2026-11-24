import type { RegionAgg, RegionLevel, TrendPoint, HourFlow, VehicleTypeStat } from '@/types'
import { VEHICLE_TYPES } from './constants'
import { clamp } from '@/utils/format'

export interface AggTarget {
  code: number
  name: string
  level: RegionLevel
  provinceCode: number
}

export function aggregateChildren(
  children: RegionAgg[],
  target: AggTarget,
  trend: TrendPoint[]
): RegionAgg {
  const n = children.length || 1
  const activeVehicles = children.reduce((s, c) => s + c.activeVehicles, 0)
  const accidentCountToday = children.reduce((s, c) => s + c.accidentCountToday, 0)
  const avgSpeed =
    activeVehicles > 0
      ? children.reduce((s, c) => s + c.avgSpeed * c.activeVehicles, 0) / activeVehicles
      : 0
  const congestionIndex = clamp(children.reduce((s, c) => s + c.congestionIndex, 0) / n, 0, 10)

  const vehicleTypes: VehicleTypeStat[] = VEHICLE_TYPES.map(t => {
    const activeCount = children.reduce(
      (s, c) => s + (c.vehicleTypes.find(v => v.typeCode === t.typeCode)?.activeCount ?? 0),
      0
    )
    return {
      typeCode: t.typeCode,
      typeName: t.typeName,
      activeCount,
      ratio: activeVehicles > 0 ? activeCount / activeVehicles : 0
    }
  })

  const hourFlow: HourFlow[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    flow: children.reduce((s, c) => s + (c.hourFlow[h]?.flow ?? 0), 0)
  }))

  return {
    code: target.code,
    name: target.name,
    level: target.level,
    provinceCode: target.provinceCode,
    congestionIndex: Math.round(congestionIndex * 100) / 100,
    activeVehicles: Math.round(activeVehicles),
    accidentCountToday,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    vehicleTypes,
    trend,
    hourFlow
  }
}

export function assertCohesion(agg: RegionAgg, label: string): void {
  if (import.meta.env.DEV) {
    const sum = agg.vehicleTypes.reduce((s, v) => s + v.activeCount, 0)
    console.assert(
      Math.abs(sum - agg.activeVehicles) <= Math.max(2, agg.activeVehicles * 0.001),
      `${label} 车辆类型口径不闭合：Σ=${sum} total=${agg.activeVehicles}`
    )
    const ratioSum = agg.vehicleTypes.reduce((s, v) => s + v.ratio, 0)
    console.assert(Math.abs(ratioSum - 1) < 0.01, `${label} 车辆类型占比不闭合：Σratio=${ratioSum}`)
  }
}