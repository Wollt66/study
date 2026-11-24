/**
 * 前端数据源工厂 —— `C-DATASOURCE@1` 实现。
 *
 * 大屏取数链路唯一入口：默认 `http`（订阅后端 SSE），`VITE_DATA_SOURCE=mock` 时
 * 退回内置 `MockEngine`（离线答辩兜底）。上层（store）只依赖该接口，
 * 数据源切换对图表组件完全透明。
 */
import type { Snapshot } from '@/types'
import { createHttpDataSource } from './httpDataSource'
import { createMockDataSource } from './mockDataSource'

export type DataSourceMode = 'http' | 'mock'

export interface DataSourceStatus {
  mode: DataSourceMode
  /** http：SSE 是否在线（轮询兜底成功时也视为数据可用）；mock：恒为 true */
  connected: boolean
  /** 降级/重连中的中文提示，正常时为 null */
  message: string | null
}

export interface DataSourceMeta {
  /** http：5000；mock：ENGINE_CONFIG.intervalMs */
  intervalMs: number
  /** http：1；mock：ENGINE_CONFIG.accel */
  accel: number
}

export interface DataSource {
  readonly mode: DataSourceMode
  readonly meta: DataSourceMeta
  start(onSnapshot: (s: Snapshot) => void): void
  pause(): void
  resume(): void
  dispose(): void
  /** 订阅数据源状态；返回取消订阅函数 */
  onStatus(cb: (s: DataSourceStatus) => void): () => void
}

/**
 * 创建数据源实例。
 * env 缺省读 `import.meta.env`；`VITE_DATA_SOURCE` 非 `'mock'` 一律按 `'http'`。
 */
export function createDataSource(env?: { VITE_DATA_SOURCE?: string }): DataSource {
  const configured = env ?? (import.meta as ImportMeta & { env?: { VITE_DATA_SOURCE?: string } }).env
  return configured?.VITE_DATA_SOURCE === 'mock' ? createMockDataSource() : createHttpDataSource()
}