/**
 * 大屏只读数据契约客户端：`C-SNAPSHOT@1` / `C-DASHBOARD@1` / `C-HISTORY@1`。
 * 只做请求与类型映射，不做业务过滤（过滤逻辑仍由 store 承担）。
 */
import type {
  AccidentSeverity,
  AccidentTypeCode,
  HourFlow,
  RegionAgg,
  Snapshot,
  TrendPoint,
  VehicleTypeCode
} from '@/types'
import { get, type QueryParams } from './client'

/* ------------------------------------------------------------------ 快照 */

/** `GET /api/traffic/snapshot` —— 响应体直接等于 `Snapshot` */
export function fetchSnapshot(): Promise<Snapshot> {
  return get<Snapshot>('/traffic/snapshot', undefined, { timeoutMs: 8000 })
}

/* ------------------------------------------------------------------ 看板 */

export interface DashboardQuery {
  regionCode?: number
  vehicleType?: VehicleTypeCode | ''
  accidentType?: AccidentTypeCode | ''
}

export interface DashboardKpi {
  congestionIndex: number
  activeVehicles: number
  accidentCountToday: number
  avgSpeed: number
}

export interface RankItem {
  intersectionId: string
  intersectionName: string
  cityCode: number
  flowPerHour: number
  congestionLevel: number
}

export interface AccidentTypeStatItem {
  typeCode: AccidentTypeCode
  typeName: string
  count: number
  ratio: number
}

export interface VehicleTypeStatItem {
  typeCode: VehicleTypeCode
  typeName: string
  activeCount: number
  ratio: number
}

export interface HeatItem {
  name: string
  value: number
  code: number
  metrics: {
    activeVehicles: number
    accidentCountToday: number
    avgSpeed: number
  }
}

export interface ScatterItem {
  coord: [number, number]
  accidentType: AccidentTypeCode
  severity: AccidentSeverity
  regionName: string
  vehicleType: VehicleTypeCode
}

export interface DashboardResult {
  region: RegionAgg
  kpi: DashboardKpi
  intersections: RankItem[]
  accidentTypeStat: AccidentTypeStatItem[]
  vehicleTypeStat: VehicleTypeStatItem[]
  heat: HeatItem[]
  scatter: ScatterItem[]
  generatedAt: number
}

/** `GET /api/traffic/dashboard` */
export function fetchDashboard(query: DashboardQuery = {}): Promise<DashboardResult> {
  const params: QueryParams = {
    regionCode: query.regionCode,
    vehicleType: query.vehicleType,
    accidentType: query.accidentType
  }
  return get<DashboardResult>('/traffic/dashboard', params)
}

/* --------------------------------------------------------------- 历史数据 */

export type TrendGranularity = '5m' | '15m' | '1h'

export interface TrendQuery {
  regionCode?: number
  /** ISO-8601 字符串 */
  from?: string
  /** ISO-8601 字符串 */
  to?: string
  granularity?: TrendGranularity
}

export interface TrendResult {
  regionCode: number
  granularity: TrendGranularity
  points: TrendPoint[]
}

/** `GET /api/traffic/history/trend` */
export function fetchTrend(query: TrendQuery = {}): Promise<TrendResult> {
  const params: QueryParams = {
    regionCode: query.regionCode,
    from: query.from,
    to: query.to,
    granularity: query.granularity
  }
  return get<TrendResult>('/traffic/history/trend', params)
}

export interface HourFlowQuery {
  regionCode?: number
  /** `YYYY-MM-DD`，缺省服务端当天（Asia/Shanghai） */
  date?: string
}

export interface HourFlowResult {
  regionCode: number
  date: string
  hours: HourFlow[]
}

/** `GET /api/traffic/history/hour-flow` */
export function fetchHourFlow(query: HourFlowQuery = {}): Promise<HourFlowResult> {
  const params: QueryParams = {
    regionCode: query.regionCode,
    date: query.date
  }
  return get<HourFlowResult>('/traffic/history/hour-flow', params)
}