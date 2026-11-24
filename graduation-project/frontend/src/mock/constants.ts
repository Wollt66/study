import type { VehicleTypeCode } from '@/types'
import { PROVINCE_SEEDS, CITY_SEEDS } from './geo-seeds'

export const COUNTRY_CODE = 100000

export const ENGINE_CONFIG = {
  intervalMs: 5000,
  accel: 60,
  seed: 20260501,
  trendWindow: 288,
  trendStepMs: 5 * 60 * 1000,
  maxActiveAccidents: 200,
  accidentLambdaBase: 8
}

export interface VehicleTypeDict {
  typeCode: VehicleTypeCode
  typeName: string
  baseRatio: number
  speedFactor: number
  hourShape: 'car' | 'bus' | 'truck' | 'ev'
}

export const VEHICLE_TYPES: VehicleTypeDict[] = [
  { typeCode: 'car', typeName: '小汽车', baseRatio: 0.62, speedFactor: 1.0, hourShape: 'car' },
  { typeCode: 'ev', typeName: '电动车', baseRatio: 0.17, speedFactor: 0.85, hourShape: 'ev' },
  { typeCode: 'truck', typeName: '货车', baseRatio: 0.13, speedFactor: 0.78, hourShape: 'truck' },
  { typeCode: 'bus', typeName: '公交车', baseRatio: 0.08, speedFactor: 0.82, hourShape: 'bus' }
]

export const VEHICLE_TYPE_MAP: Record<VehicleTypeCode, VehicleTypeDict> = Object.fromEntries(
  VEHICLE_TYPES.map(t => [t.typeCode, t])
) as Record<VehicleTypeCode, VehicleTypeDict>

export interface AccidentTypeDict {
  typeCode: string
  typeName: string
}

export const ACCIDENT_TYPES: AccidentTypeDict[] = [
  { typeCode: 'rearEnd', typeName: '追尾' },
  { typeCode: 'scratch', typeName: '刮擦' },
  { typeCode: 'rollover', typeName: '侧翻' },
  { typeCode: 'pedestrian', typeName: '碰撞行人' },
  { typeCode: 'other', typeName: '其他' }
]

export const ACCIDENT_TYPE_MAP: Record<string, AccidentTypeDict> = Object.fromEntries(
  ACCIDENT_TYPES.map(t => [t.typeCode, t])
)

export const SEVERITIES = [
  { code: 'minor', name: '轻微', symbolSize: 8, color: '#00FFA3' },
  { code: 'moderate', name: '一般', symbolSize: 12, color: '#FFB800' },
  { code: 'severe', name: '严重', symbolSize: 16, color: '#FF3B3B' }
] as const

export const SEVERITY_MAP = Object.fromEntries(SEVERITIES.map(s => [s.code, s]))

export const BUILTIN_PROVINCE_CODES = [440000, 320000, 330000, 510000]
export const BUILTIN_CITY_CODES = [440100, 320100, 330100, 510100]

export const NATIONAL_BASE_VEHICLES = 3_200_000

export const PROVINCE_WEIGHTS: Record<number, number> = {
  440000: 1.0, 320000: 0.92, 330000: 0.86, 370000: 0.8, 410000: 0.76, 510000: 0.74,
  130000: 0.68, 430000: 0.66, 420000: 0.65, 340000: 0.62, 310000: 0.6, 350000: 0.58,
  110000: 0.56, 500000: 0.52, 460000: 0.3, 120000: 0.38, 150000: 0.38, 210000: 0.46,
  220000: 0.36, 230000: 0.38, 360000: 0.44, 450000: 0.44, 530000: 0.44, 610000: 0.46,
  710000: 0.42, 520000: 0.36, 640000: 0.18, 650000: 0.34, 140000: 0.42, 620000: 0.3,
  540000: 0.12, 630000: 0.16, 810000: 0.24, 820000: 0.1
}

export const CITY_SHARES: Record<number, number> = {
  440100: 0.26, 440300: 0.24, 440600: 0.07, 441900: 0.07, 440800: 0.035, 440900: 0.035,
  441300: 0.04, 445200: 0.03, 440500: 0.03, 440700: 0.03, 441200: 0.02, 442000: 0.03,
  440400: 0.02, 445100: 0.015, 440200: 0.015, 441600: 0.012, 441800: 0.012, 441500: 0.012,
  441400: 0.015, 441700: 0.012, 445300: 0.011,
  320100: 0.19, 320500: 0.24, 320200: 0.12, 320400: 0.07, 320600: 0.08, 320300: 0.07,
  320900: 0.05, 321000: 0.04, 321200: 0.04, 321100: 0.03, 320800: 0.03, 320700: 0.025,
  321300: 0.025,
  330100: 0.25, 330200: 0.22, 330300: 0.13, 330400: 0.06, 330600: 0.06, 331000: 0.06,
  330700: 0.05, 330500: 0.04, 330800: 0.025, 331100: 0.02, 330900: 0.015,
  510100: 0.38, 510700: 0.07, 511500: 0.05, 511300: 0.05, 510600: 0.04, 510500: 0.04,
  511700: 0.04, 511100: 0.035, 510300: 0.025, 511000: 0.025, 511400: 0.025, 510900: 0.025,
  511600: 0.02, 512000: 0.02, 510400: 0.015, 510800: 0.015, 511800: 0.012, 511900: 0.015,
  513400: 0.04, 513200: 0.008, 513300: 0.006
}

export const INTERSECTION_ROAD_WORDS = [
  '中山', '人民', '解放', '建设', '朝阳', '长安', '复兴', '滨江', '天府', '科华',
  '珠光', '珠江', '玄武', '西湖', '锦城', '高新', '金鸡', '云锦', '香樟', '梧桐'
]

export const INTERSECTION_SUFFIX = ['大道', '路', '大街', '快速路']

export function normalizeCityShares(provinceCode: number): Array<[number, number]> {
  const entries = Object.entries(CITY_SHARES)
    .filter(([code]) => CITY_SEEDS.find(c => c.code === Number(code) && c.provinceCode === provinceCode))
    .map(([code, share]) => [Number(code), share] as [number, number])
  const sum = entries.reduce((s, [, share]) => s + share, 0)
  return entries.map(([code, share]) => [code, share / sum])
}

export function citySeedOf(code: number) {
  return CITY_SEEDS.find(c => c.code === code)
}

export function provinceSeedOf(code: number) {
  return PROVINCE_SEEDS.find(p => p.code === code)
}

export function provinceName(code: number) {
  return PROVINCE_SEEDS.find(p => p.code === code)?.name ?? `区域${code}`
}

export function cityName(code: number) {
  return CITY_SEEDS.find(c => c.code === code)?.name ?? `城市${code}`
}