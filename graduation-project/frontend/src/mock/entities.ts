import type {
  RegionLevel,
  RegionAgg,
  TrendPoint,
  HourFlow,
  VehicleTypeCode,
  VehicleTypeStat
} from '@/types'
import { PROVINCE_SEEDS, CITY_SEEDS } from './geo-seeds'
import {
  VEHICLE_TYPES,
  BUILTIN_PROVINCE_CODES,
  BUILTIN_CITY_CODES,
  PROVINCE_WEIGHTS,
  normalizeCityShares,
  INTERSECTION_ROAD_WORDS,
  INTERSECTION_SUFFIX,
  NATIONAL_BASE_VEHICLES
} from './constants'
import { NoiseChannel, mulberry32, hourFactor, typeHourFactor, type Rand } from './noise'
import { clamp } from '@/utils/format'

export interface IntersectionState {
  intersectionId: string
  intersectionName: string
  cityCode: number
  roadWeight: number
  congestionJitter: number
  noise: NoiseChannel
  flowPerHour: number
  congestionLevel: number
  typeFlow: Record<VehicleTypeCode, number>
}

export interface RegionState {
  code: number
  name: string
  provinceCode: number
  level: RegionLevel
  centroid: [number, number]
  geoAvailable: boolean
  vehiclesBase: number
  noiseV: NoiseChannel
  noiseC: NoiseChannel
  noiseS: NoiseChannel
  typeRatios: Record<VehicleTypeCode, number>
  hourFlowNoise: number[]
  vehicles: number
  congestion: number
  avgSpeed: number
  accidentCountToday: number
  trend: TrendPoint[]
  intersections: IntersectionState[]
}

export interface World {
  rand: Rand
  cities: RegionState[]
  outerProvinces: RegionState[]
  builtinProvinces: Array<{
    code: number
    name: string
    centroid: [number, number]
    cityCodes: number[]
  }>
  provinceTrend: Map<number, TrendPoint[]>
  countryTrend: TrendPoint[]
}

export function hourOf(ts: number): number {
  const d = new Date(ts)
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

function ratioWithJitter(rand: Rand): Record<VehicleTypeCode, number> {
  const raw = VEHICLE_TYPES.map(t => t.baseRatio * (0.97 + rand() * 0.06))
  const sum = raw.reduce((s, v) => s + v, 0)
  const result = {} as Record<VehicleTypeCode, number>
  VEHICLE_TYPES.forEach((t, i) => {
    result[t.typeCode] = raw[i] / sum
  })
  return result
}

function makeIntersection(rand: Rand, cityCode: number, seq: number): IntersectionState {
  const w1 = INTERSECTION_ROAD_WORDS[Math.floor(rand() * INTERSECTION_ROAD_WORDS.length)]
  let w2 = w1
  while (w2 === w1) {
    w2 = INTERSECTION_ROAD_WORDS[Math.floor(rand() * INTERSECTION_ROAD_WORDS.length)]
  }
  const s1 = INTERSECTION_SUFFIX[Math.floor(rand() * INTERSECTION_SUFFIX.length)]
  const s2 = INTERSECTION_SUFFIX[Math.floor(rand() * INTERSECTION_SUFFIX.length)]
  return {
    intersectionId: `${cityCode}-${seq}`,
    intersectionName: `${w1}${s1} · ${w2}${s2}`,
    cityCode,
    roadWeight: 0.6 + rand() * 0.8,
    congestionJitter: 0.85 + rand() * 0.3,
    noise: new NoiseChannel({
      base: 1,
      rand,
      amp1: 0.08,
      amp2: 0.04,
      walkMaxRatio: 0.06,
      walkSigmaRatio: 0.01,
      min: 0.7,
      max: 1.3
    }),
    flowPerHour: 0,
    congestionLevel: 0,
    typeFlow: { car: 0, bus: 0, truck: 0, ev: 0 }
  }
}

function makeRegion(opts: {
  code: number
  name: string
  provinceCode: number
  level: RegionLevel
  centroid: [number, number]
  geoAvailable: boolean
  vehiclesBase: number
  rand: Rand
  intersectionCount: number
}): RegionState {
  const intersections: IntersectionState[] = []
  for (let i = 0; i < opts.intersectionCount; i++) {
    intersections.push(makeIntersection(opts.rand, opts.code, i + 1))
  }
  const hourFlowNoise: number[] = []
  for (let h = 0; h < 24; h++) hourFlowNoise.push(0.95 + opts.rand() * 0.1)
  return {
    code: opts.code,
    name: opts.name,
    provinceCode: opts.provinceCode,
    level: opts.level,
    centroid: opts.centroid,
    geoAvailable: opts.geoAvailable,
    vehiclesBase: opts.vehiclesBase,
    noiseV: new NoiseChannel({ base: 1, rand: opts.rand, min: 0.85, max: 1.15 }),
    noiseC: new NoiseChannel({ base: 1, rand: opts.rand, min: 0.8, max: 1.2 }),
    noiseS: new NoiseChannel({ base: 1, rand: opts.rand, min: 0.92, max: 1.08 }),
    typeRatios: ratioWithJitter(opts.rand),
    hourFlowNoise,
    vehicles: 0,
    congestion: 0,
    avgSpeed: 0,
    accidentCountToday: 0,
    trend: [],
    intersections
  }
}

export function buildWorld(seed: number): World {
  return buildWorldInner(seed)
}

function buildWorldInner(seed: number): World {
  const rand = mulberry32(seed)
  const totalWeight = PROVINCE_SEEDS.reduce(
    (s, p) => s + (PROVINCE_WEIGHTS[p.code] ?? 0.3),
    0
  )

  const cities: RegionState[] = []
  const builtinProvinces: World['builtinProvinces'] = []

  for (const provCode of BUILTIN_PROVINCE_CODES) {
    const provSeed = PROVINCE_SEEDS.find(p => p.code === provCode)
    if (!provSeed) continue
    const provBase = (NATIONAL_BASE_VEHICLES * (PROVINCE_WEIGHTS[provCode] ?? 0.5)) / totalWeight
    const shares = normalizeCityShares(provCode)
    const cityCodes: number[] = []
    for (const [cityCode, share] of shares) {
      const citySeed = CITY_SEEDS.find(c => c.code === cityCode)
      if (!citySeed) continue
      const isKeyCity = BUILTIN_CITY_CODES.includes(cityCode)
      cities.push(
        makeRegion({
          code: cityCode,
          name: citySeed.name,
          provinceCode: provCode,
          level: 'city',
          centroid: citySeed.centroid,
          geoAvailable: isKeyCity,
          vehiclesBase: provBase * share,
          rand,
          intersectionCount: isKeyCity ? 13 + Math.floor(rand() * 3) : 8 + Math.floor(rand() * 8)
        })
      )
      cityCodes.push(cityCode)
    }
    builtinProvinces.push({
      code: provCode,
      name: provSeed.name,
      centroid: provSeed.centroid,
      cityCodes
    })
  }

  const outerProvinces = PROVINCE_SEEDS.filter(
    p => !BUILTIN_PROVINCE_CODES.includes(p.code)
  ).map(p =>
    makeRegion({
      code: p.code,
      name: p.name,
      provinceCode: 100000,
      level: 'province',
      centroid: p.centroid,
      geoAvailable: false,
      vehiclesBase: (NATIONAL_BASE_VEHICLES * (PROVINCE_WEIGHTS[p.code] ?? 0.3)) / totalWeight,
      rand,
      intersectionCount: 3
    })
  )

  const provinceTrend = new Map<number, TrendPoint[]>()
  for (const bp of builtinProvinces) provinceTrend.set(bp.code, [])

  return {
    rand,
    cities,
    outerProvinces,
    builtinProvinces,
    provinceTrend,
    countryTrend: []
  }
}

export function evolveRegion(r: RegionState, simTime: number): void {
  const h = hourOf(simTime)
  const hf = hourFactor(h)
  r.vehicles = r.vehiclesBase * hf * r.noiseV.value(simTime)
  const targetC = 3.2 + 3.6 * hf
  r.congestion = clamp(targetC * r.noiseC.value(simTime), 0, 10)
  r.avgSpeed = clamp((58 - 3.8 * r.congestion) * r.noiseS.value(simTime), 15, 80)
  r.trend.push({ time: simTime, value: Math.round(r.congestion * 100) / 100 })
  if (r.trend.length > 288) r.trend.shift()
}

export function evolveIntersections(city: RegionState, simTime: number): void {
  const h = hourOf(simTime)
  const cityFlowBase = city.vehiclesBase * 0.018
  for (const i of city.intersections) {
    i.flowPerHour = cityFlowBase * i.roadWeight * i.noise.value(simTime)
    i.congestionLevel = clamp(city.congestion * i.roadWeight * i.congestionJitter, 0, 10)
    const raw = VEHICLE_TYPES.map(t => city.typeRatios[t.typeCode] * typeHourFactor(h, t.hourShape))
    const sum = raw.reduce((s, v) => s + v, 0)
    VEHICLE_TYPES.forEach((t, idx) => {
      i.typeFlow[t.typeCode] = (i.flowPerHour * raw[idx]) / (sum || 1)
    })
  }
}

export function vehicleTypesOf(
  vehicles: number,
  ratios: Record<VehicleTypeCode, number>,
  h: number
): VehicleTypeStat[] {
  const raw = VEHICLE_TYPES.map(t => ratios[t.typeCode] * typeHourFactor(h, t.hourShape))
  const sum = raw.reduce((s, v) => s + v, 0)
  return VEHICLE_TYPES.map((t, idx) => ({
    typeCode: t.typeCode,
    typeName: t.typeName,
    activeCount: (vehicles * raw[idx]) / (sum || 1),
    ratio: raw[idx] / (sum || 1)
  }))
}

export function hourFlowOf(r: RegionState): HourFlow[] {
  const result: HourFlow[] = []
  for (let h = 0; h < 24; h++) {
    result.push({
      hour: h,
      flow: Math.round(r.vehiclesBase * 0.2 * hourFactor(h) * r.hourFlowNoise[h])
    })
  }
  return result
}

export function regionToAgg(r: RegionState): RegionAgg {
  const h = hourOf(r.trend.at(-1)?.time ?? Date.now())
  return {
    code: r.code,
    name: r.name,
    level: r.level,
    provinceCode: r.provinceCode,
    congestionIndex: Math.round(r.congestion * 100) / 100,
    activeVehicles: Math.round(r.vehicles),
    accidentCountToday: r.accidentCountToday,
    avgSpeed: Math.round(r.avgSpeed * 10) / 10,
    vehicleTypes: vehicleTypesOf(r.vehicles, r.typeRatios, h),
    trend: r.trend,
    hourFlow: hourFlowOf(r)
  }
}