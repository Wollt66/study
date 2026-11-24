export type RegionLevel = 'country' | 'province' | 'city'
export type VehicleTypeCode = 'car' | 'bus' | 'truck' | 'ev'
export type AccidentTypeCode = 'rearEnd' | 'scratch' | 'rollover' | 'pedestrian' | 'other'
export type AccidentSeverity = 'minor' | 'moderate' | 'severe'
export type AccidentStatus = 'processing' | 'closed'

export interface RegionMetrics {
  congestionIndex: number
  activeVehicles: number
  accidentCountToday: number
  avgSpeed: number
}

export interface VehicleTypeStat {
  typeCode: VehicleTypeCode
  typeName: string
  activeCount: number
  ratio: number
}

export interface TrendPoint {
  time: number
  value: number
}

export interface HourFlow {
  hour: number
  flow: number
}

export interface RegionAgg extends RegionMetrics {
  code: number
  name: string
  level: RegionLevel
  provinceCode: number
  vehicleTypes: VehicleTypeStat[]
  trend: TrendPoint[]
  hourFlow: HourFlow[]
}

export interface IntersectionEntity {
  intersectionId: string
  intersectionName: string
  cityCode: number
  flowPerHour: number
  congestionLevel: number
  typeFlow: Record<VehicleTypeCode, number>
}

export interface AccidentRecord {
  accidentId: string
  accidentType: AccidentTypeCode
  severity: AccidentSeverity
  regionCode: number
  vehicleType: VehicleTypeCode
  coord: [number, number]
  occurTime: number
  status: AccidentStatus
}

export interface Snapshot {
  simTime: number
  country: RegionAgg
  provinces: RegionAgg[]
  cities: RegionAgg[]
  intersections: IntersectionEntity[]
  accidents: AccidentRecord[]
}

export type RegionDimension = 'region' | 'vehicleType' | 'accidentType'

export interface FilterTag {
  dimension: Exclude<RegionDimension, 'region'> | 'region'
  label: string
  value: string
}

export interface MapScatterItem {
  coord: [number, number]
  accidentType: AccidentTypeCode
  severity: AccidentSeverity
  regionName: string
  vehicleType: VehicleTypeCode
}

export const CONGESTION_BANDS = [
  { min: 0, max: 2, label: '畅通', color: '#00FFA3' },
  { min: 2, max: 4, label: '基本畅通', color: '#00F0FF' },
  { min: 4, max: 6, label: '轻度拥堵', color: '#FFB800' },
  { min: 6, max: 8, label: '中度拥堵', color: '#FF2D95' },
  { min: 8, max: 10.01, label: '严重拥堵', color: '#FF3B3B' }
] as const

export function congestionBand(index: number) {
  return CONGESTION_BANDS.find(b => index >= b.min && index < b.max) ?? CONGESTION_BANDS[4]
}