import { registerMap } from 'echarts/core'

const loaders = import.meta.glob<unknown>('../assets/geo/*.json')

const CODE_FILE: Record<number, string> = {
  100000: 'china',
  440000: 'guangdong',
  320000: 'jiangsu',
  330000: 'zhejiang',
  510000: 'sichuan',
  440100: 'guangzhou',
  320100: 'nanjing',
  330100: 'hangzhou',
  510100: 'chengdu'
}

const registered = new Set<number>()
const pending = new Map<number, Promise<boolean>>()

export function isGeoAvailable(code: number): boolean {
  return CODE_FILE[code] !== undefined
}

export function geoMapName(code: number): string {
  return String(code)
}

export function loadGeo(code: number): Promise<boolean> {
  if (registered.has(code)) return Promise.resolve(true)
  const inflight = pending.get(code)
  if (inflight) return inflight
  const file = CODE_FILE[code]
  if (!file) return Promise.resolve(false)
  const loader = loaders[`../assets/geo/${file}.json`]
  if (!loader) return Promise.resolve(false)
  const task = loader()
    .then(mod => {
      registerMap(String(code), mod as never)
      registered.add(code)
      pending.delete(code)
      return true
    })
    .catch(err => {
      console.error(`[mapRegistry] geoJSON 加载失败：${file}`, err)
      pending.delete(code)
      return false
    })
  pending.set(code, task)
  return task
}