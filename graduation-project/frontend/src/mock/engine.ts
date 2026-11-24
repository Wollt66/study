import type { Snapshot, RegionAgg, AccidentRecord, AccidentSeverity, IntersectionEntity } from '@/types'
import {
  ENGINE_CONFIG,
  BUILTIN_PROVINCE_CODES,
  PROVINCE_WEIGHTS,
  normalizeCityShares,
  ACCIDENT_TYPES,
  VEHICLE_TYPES
} from './constants'
import { PROVINCE_SEEDS } from './geo-seeds'
import {
  buildWorld,
  evolveRegion,
  evolveIntersections,
  regionToAgg,
  hourOf,
  type World,
  type RegionState
} from './entities'
import { aggregateChildren, assertCohesion } from './aggregate'
import { hourFactor } from './noise'
import { clamp } from '@/utils/format'

export interface EngineConfig {
  intervalMs: number
  accel: number
  seed: number
}

interface ProvincePickEntry {
  code: number
  cum: number
  state: RegionState | null
  cityCum: Array<{ code: number; cum: number; share: number; state: RegionState }> | null
}

function poisson(rand: () => number, lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rand()
  } while (p > L)
  return k - 1
}

const CLOSE_PROB: Record<AccidentSeverity, number> = {
  minor: 0.05,
  moderate: 0.025,
  severe: 0.012
}

export class MockEngine {
  private world: World
  private timer: ReturnType<typeof setInterval> | null = null
  private paused = false
  private disposed = false
  private activeAccidents: AccidentRecord[] = []
  private accidentSeq = 0
  private provinceCum: ProvincePickEntry[] = []
  private regionIndex = new Map<number, RegionState>()
  private totalWeight = 0
  private readonly config: EngineConfig
  simTime = 0
  onSnapshot: ((s: Snapshot) => void) | null = null

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...ENGINE_CONFIG, ...config }
    this.world = buildWorld(this.config.seed)
    this.buildIndexes()
  }

  private buildIndexes(): void {
    for (const c of this.world.cities) this.regionIndex.set(c.code, c)
    for (const p of this.world.outerProvinces) this.regionIndex.set(p.code, p)

    let cum = 0
    for (const seed of PROVINCE_SEEDS) {
      const weight = PROVINCE_WEIGHTS[seed.code] ?? 0.3
      cum += weight
      const builtin = BUILTIN_PROVINCE_CODES.includes(seed.code)
      let cityCum: ProvincePickEntry['cityCum'] = null
      if (builtin) {
        let cityCumAcc = 0
        cityCum = normalizeCityShares(seed.code).map(([code, share]) => {
          cityCumAcc += share
          return { code, cum: cityCumAcc, share, state: this.regionIndex.get(code)! }
        })
      }
      this.provinceCum.push({
        code: seed.code,
        cum,
        state: builtin ? null : this.regionIndex.get(seed.code)!,
        cityCum
      })
    }
    this.totalWeight = cum
  }

  private pickAccidentTarget(): RegionState {
    const r = this.world.rand() * this.totalWeight
    let prov = this.provinceCum[this.provinceCum.length - 1]
    for (const entry of this.provinceCum) {
      if (r <= entry.cum) {
        prov = entry
        break
      }
    }
    if (prov.cityCum) {
      const r2 = this.world.rand()
      let city = prov.cityCum[prov.cityCum.length - 1]
      for (const entry of prov.cityCum) {
        if (r2 <= entry.cum) {
          city = entry
          break
        }
      }
      return city.state
    }
    return prov.state!
  }

  private makeAccident(state: RegionState, occurTime: number): AccidentRecord {
    const rand = this.world.rand
    const rSeverity = rand()
    const severity: AccidentSeverity = rSeverity < 0.55 ? 'minor' : rSeverity < 0.87 ? 'moderate' : 'severe'
    const rType = rand()
    let accidentType = ACCIDENT_TYPES[ACCIDENT_TYPES.length - 1].typeCode
    for (let i = 0; i < ACCIDENT_TYPES.length; i++) {
      if (rType < (i + 1) / ACCIDENT_TYPES.length) {
        accidentType = ACCIDENT_TYPES[i].typeCode
        break
      }
    }
    const rVehicle = rand() * VEHICLE_TYPES.reduce((s, t) => s + t.baseRatio, 0)
    let acc = 0
    let vehicleType = VEHICLE_TYPES[0].typeCode
    for (const t of VEHICLE_TYPES) {
      acc += t.baseRatio
      if (rVehicle < acc) {
        vehicleType = t.typeCode
        break
      }
    }
    const spread = state.level === 'city' ? 0.24 : 0.7
    return {
      accidentId: `AC-${String(++this.accidentSeq).padStart(5, '0')}`,
      accidentType: accidentType as AccidentRecord['accidentType'],
      severity,
      regionCode: state.code,
      vehicleType,
      coord: [
        state.centroid[0] + (rand() - 0.5) * spread,
        state.centroid[1] + (rand() - 0.5) * spread
      ],
      occurTime,
      status: 'processing'
    }
  }

  private evolveAll(t: number): void {
    for (const c of this.world.cities) {
      evolveRegion(c, t)
      evolveIntersections(c, t)
    }
    for (const p of this.world.outerProvinces) evolveRegion(p, t)
  }

  private pushParentTrendOnly(t: number): void {
    const congOf = new Map<number, number>()
    for (const bp of this.world.builtinProvinces) {
      let sum = 0
      let n = 0
      for (const c of this.world.cities) {
        if (c.provinceCode === bp.code) {
          sum += c.congestion
          n++
        }
      }
      const value = n > 0 ? sum / n : 0
      congOf.set(bp.code, value)
      const trend = this.world.provinceTrend.get(bp.code)!
      trend.push({ time: t, value: Math.round(value * 100) / 100 })
      if (trend.length > ENGINE_CONFIG.trendWindow) trend.shift()
    }
    let countrySum = 0
    let countryN = 0
    for (const seed of PROVINCE_SEEDS) {
      countrySum += congOf.get(seed.code) ?? this.world.outerProvinces.find(p => p.code === seed.code)?.congestion ?? 0
      countryN++
    }
    const countryValue = countrySum / (countryN || 1)
    this.world.countryTrend.push({ time: t, value: Math.round(countryValue * 100) / 100 })
    if (this.world.countryTrend.length > ENGINE_CONFIG.trendWindow) this.world.countryTrend.shift()
  }

  private bootstrap(): void {
    for (let k = ENGINE_CONFIG.trendWindow; k >= 1; k--) {
      const t = this.simTime - k * ENGINE_CONFIG.trendStepMs
      this.evolveAll(t)
      this.pushParentTrendOnly(t)
    }

    const dayStart = new Date(this.simTime)
    dayStart.setHours(0, 0, 0, 0)
    const elapsedRatio = clamp((this.simTime - dayStart.getTime()) / 86400000, 0.05, 1)
    const dailyTarget =
      ENGINE_CONFIG.accidentLambdaBase * ENGINE_CONFIG.trendWindow * 0.45 * elapsedRatio

    for (const entry of this.provinceCum) {
      const provTarget = dailyTarget * ((PROVINCE_WEIGHTS[entry.code] ?? 0.3) / this.totalWeight)
      if (entry.cityCum) {
        for (const city of entry.cityCum) {
          city.state.accidentCountToday = Math.round(provTarget * city.share)
        }
      } else {
        entry.state!.accidentCountToday = Math.round(provTarget)
      }
    }

    let totalToday = 0
    for (const c of this.world.cities) totalToday += c.accidentCountToday
    for (const p of this.world.outerProvinces) totalToday += p.accidentCountToday
    const historyCount = Math.min(140, Math.round(totalToday * 0.18))
    for (let i = 0; i < historyCount; i++) {
      const target = this.pickAccidentTarget()
      const occurTime = dayStart.getTime() + this.world.rand() * (this.simTime - dayStart.getTime())
      this.activeAccidents.push(this.makeAccident(target, occurTime))
    }
    this.activeAccidents.sort((a, b) => a.occurTime - b.occurTime)
  }

  private spawnAccidents(): void {
    const h = hourOf(this.simTime)
    const lambda = ENGINE_CONFIG.accidentLambdaBase * hourFactor(h)
    const n = poisson(this.world.rand, lambda)
    for (let i = 0; i < n; i++) {
      const target = this.pickAccidentTarget()
      target.accidentCountToday++
      this.activeAccidents.push(this.makeAccident(target, this.simTime - this.world.rand() * 20 * 60000))
    }
    if (this.activeAccidents.length > ENGINE_CONFIG.maxActiveAccidents) {
      this.activeAccidents = this.activeAccidents.slice(
        this.activeAccidents.length - ENGINE_CONFIG.maxActiveAccidents
      )
    }
  }

  private closeAccidents(): void {
    if (this.activeAccidents.length === 0) return
    const rand = this.world.rand
    this.activeAccidents = this.activeAccidents.filter(a => rand() > CLOSE_PROB[a.severity])
  }

  private buildSnapshot(): Snapshot {
    const cityAggs = this.world.cities.map(regionToAgg)
    const provinceAggs: RegionAgg[] = []

    for (const bp of this.world.builtinProvinces) {
      const children = cityAggs.filter(c => c.provinceCode === bp.code)
      const trend = this.world.provinceTrend.get(bp.code)!
      const agg = aggregateChildren(
        children,
        { code: bp.code, name: bp.name, level: 'province', provinceCode: 100000 },
        trend
      )
      trend.push({ time: this.simTime, value: agg.congestionIndex })
      if (trend.length > ENGINE_CONFIG.trendWindow) trend.shift()
      provinceAggs.push(agg)
    }
    for (const p of this.world.outerProvinces) provinceAggs.push(regionToAgg(p))

    const countryTrend = this.world.countryTrend
    const country = aggregateChildren(
      provinceAggs,
      { code: 100000, name: '全国', level: 'country', provinceCode: 100000 },
      countryTrend
    )
    countryTrend.push({ time: this.simTime, value: country.congestionIndex })
    if (countryTrend.length > ENGINE_CONFIG.trendWindow) countryTrend.shift()

    if (import.meta.env.DEV) {
      assertCohesion(country, '全国')
      for (const p of provinceAggs) assertCohesion(p, p.name)
    }

    const intersections: IntersectionEntity[] = []
    const collect = (r: RegionState) => {
      for (const i of r.intersections) {
        intersections.push({
          intersectionId: i.intersectionId,
          intersectionName: i.intersectionName,
          cityCode: i.cityCode,
          flowPerHour: Math.round(i.flowPerHour),
          congestionLevel: Math.round(i.congestionLevel * 100) / 100,
          typeFlow: { ...i.typeFlow }
        })
      }
    }
    for (const c of this.world.cities) collect(c)
    for (const p of this.world.outerProvinces) collect(p)

    return {
      simTime: this.simTime,
      country,
      provinces: provinceAggs,
      cities: cityAggs,
      intersections,
      accidents: [...this.activeAccidents]
    }
  }

  private tick(): void {
    this.simTime += this.config.intervalMs * this.config.accel
    this.evolveAll(this.simTime)
    this.spawnAccidents()
    this.closeAccidents()
    this.emit()
  }

  private emit(): void {
    if (this.onSnapshot && !this.disposed) {
      this.onSnapshot(this.buildSnapshot())
    }
  }

  start(onSnapshot: (s: Snapshot) => void): void {
    if (this.disposed || this.timer) return
    this.onSnapshot = onSnapshot
    this.simTime = Date.now()
    this.bootstrap()
    this.emit()
    this.timer = setInterval(() => this.tick(), this.config.intervalMs)
  }

  pause(): void {
    if (this.paused || !this.timer) return
    this.paused = true
    clearInterval(this.timer)
    this.timer = null
  }

  resume(): void {
    if (!this.paused || this.disposed) return
    this.paused = false
    this.timer = setInterval(() => this.tick(), this.config.intervalMs)
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.disposed = true
    this.onSnapshot = null
    this.activeAccidents = []
  }
}