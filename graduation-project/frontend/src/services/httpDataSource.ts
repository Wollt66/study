/**
 * http 数据源：后端 SSE（`C-SSE@1`）订阅 + 快照兜底轮询。
 *
 * 行为约定（与 plan §2.2.10 / §2.2.14 一致）：
 * 1. `start` 时先拉一次 `GET /api/traffic/snapshot`，随后建立 `EventSource`；
 * 2. 收到 `snapshot` 帧 → JSON.parse → `isSnapshot` 结构校验 → 回调；
 *    非法帧直接丢弃，状态置 `message='数据格式异常'`；
 * 3. `onerror` 关闭连接，按 1→2→4→8→16→30s 指数退避重连；
 *    断连期间每 10s 用快照兜底，兜底成功即把状态置回 `connected=true`；
 * 4. `pause` 关闭连接与定时器但保留最后一帧；`resume` 重新订阅；
 * 5. `dispose` 清理全部定时器与连接。
 */
import type { Snapshot } from '@/types'
import { fetchSnapshot } from '@/api/traffic'
import { apiUrl } from '@/api/client'
import type { DataSource, DataSourceMeta, DataSourceMode, DataSourceStatus } from './dataSource'

/** 数据源状态广播事件名（`App.vue` 的全局降级提示在此订阅，避免耦合 store） */
export const DATA_SOURCE_STATUS_EVENT = 'traffic:datasource-status'

/** 指数退避重连间隔（毫秒，末项为上限） */
const RECONNECT_BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000]

/** 断连期间的快照兜底轮询间隔 */
const FALLBACK_POLL_MS = 10000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function isRegionAggLike(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.code === 'number' &&
    typeof value.name === 'string' &&
    typeof value.congestionIndex === 'number' &&
    Array.isArray(value.trend) &&
    Array.isArray(value.hourFlow) &&
    Array.isArray(value.vehicleTypes)
  )
}

/**
 * 快照结构校验：只校验大屏消费所必需的结构，避免过严导致合法帧被丢弃。
 * 校验失败即视为非法帧（`数据格式异常`）。
 */
export function isSnapshot(value: unknown): value is Snapshot {
  if (!isRecord(value)) return false
  if (typeof value.simTime !== 'number' || !Number.isFinite(value.simTime)) return false
  if (!isRegionAggLike(value.country)) return false

  const regionLists = ['provinces', 'cities'] as const
  for (const key of regionLists) {
    const list = value[key]
    if (!Array.isArray(list) || !list.every(isRegionAggLike)) return false
  }

  const intersections = value.intersections
  if (
    !Array.isArray(intersections) ||
    !intersections.every(
      item =>
        isRecord(item) &&
        typeof item.intersectionId === 'string' &&
        typeof item.cityCode === 'number' &&
        typeof item.flowPerHour === 'number'
    )
  ) {
    return false
  }

  const accidents = value.accidents
  if (
    !Array.isArray(accidents) ||
    !accidents.every(
      item =>
        isRecord(item) &&
        typeof item.accidentId === 'string' &&
        Array.isArray(item.coord) &&
        item.coord.length === 2 &&
        typeof item.coord[0] === 'number' &&
        typeof item.coord[1] === 'number'
    )
  ) {
    return false
  }

  return true
}

class HttpDataSource implements DataSource {
  readonly mode: DataSourceMode = 'http'

  readonly meta: DataSourceMeta = { intervalMs: 5000, accel: 1 }

  private readonly listeners = new Set<(status: DataSourceStatus) => void>()
  private status: DataSourceStatus = { mode: 'http', connected: false, message: '正在连接实时数据…' }
  private source: EventSource | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempt = 0
  private started = false
  private paused = false
  private disposed = false
  private snapshotLoading = false
  private lastSnapshot: Snapshot | null = null
  private onSnapshot: ((snapshot: Snapshot) => void) | null = null

  start(onSnapshot: (s: Snapshot) => void): void {
    this.onSnapshot = onSnapshot
    if (this.started) {
      if (this.lastSnapshot) onSnapshot(this.lastSnapshot)
      return
    }
    this.started = true
    this.paused = false
    this.disposed = false
    this.reconnectAttempt = 0
    this.emitStatus({ connected: false, message: '正在连接实时数据…' })
    // 首次兜底请求与 SSE 建连并行，避免后端延迟拖慢实时通道
    void this.loadSnapshot()
    this.connect()
  }

  pause(): void {
    if (!this.started || this.paused) return
    this.paused = true
    this.stopTimers()
    this.closeSource()
    this.emitStatus({ connected: false, message: '数据刷新已暂停' })
  }

  resume(): void {
    if (!this.started || this.disposed || !this.paused) return
    this.paused = false
    this.reconnectAttempt = 0
    this.emitStatus({ connected: false, message: '正在恢复实时数据…' })
    void this.loadSnapshot()
    this.connect()
  }

  dispose(): void {
    this.disposed = true
    this.started = false
    this.paused = false
    this.stopTimers()
    this.closeSource()
    this.emitStatus({ connected: false, message: null })
    this.listeners.clear()
    this.onSnapshot = null
    this.lastSnapshot = null
  }

  onStatus(cb: (s: DataSourceStatus) => void): () => void {
    this.listeners.add(cb)
    cb(this.status)
    return () => {
      this.listeners.delete(cb)
    }
  }

  /* --------------------------------------------------------- SSE 连接管理 */

  private connect(): void {
    if (this.disposed || this.paused || this.source) return
    if (typeof EventSource === 'undefined') {
      // 无 EventSource 的宿主环境（如旧版浏览器）退化为纯轮询
      this.emitStatus({ connected: false, message: '当前环境不支持实时推送，已切换为轮询模式' })
      this.startPolling()
      return
    }
    const es = new EventSource(apiUrl('/traffic/stream'))
    this.source = es
    es.onopen = this.handleOpen
    es.onerror = this.handleError
    es.addEventListener('snapshot', this.handleSnapshotEvent)
  }

  private closeSource(): void {
    if (!this.source) return
    const es = this.source
    this.source = null
    es.onopen = null
    es.onerror = null
    es.removeEventListener('snapshot', this.handleSnapshotEvent)
    es.close()
  }

  private readonly handleOpen = (): void => {
    this.reconnectAttempt = 0
    this.stopPolling()
    this.emitStatus({ connected: true, message: null })
  }

  private readonly handleSnapshotEvent = (event: Event): void => {
    if (this.disposed) return
    const message = event as MessageEvent<string>
    if (typeof message.data !== 'string' || message.data.length === 0) return
    let parsed: unknown
    try {
      parsed = JSON.parse(message.data)
    } catch {
      this.emitStatus({ message: '数据格式异常' })
      return
    }
    if (!isSnapshot(parsed)) {
      // 非法帧丢弃，保留最后一帧
      this.emitStatus({ message: '数据格式异常' })
      return
    }
    this.reconnectAttempt = 0
    this.stopPolling()
    this.emitStatus({ connected: true, message: null })
    this.applySnapshot(parsed)
  }

  private readonly handleError = (): void => {
    if (this.disposed) return
    this.closeSource()
    if (this.paused) return
    this.emitStatus({ connected: false, message: '实时连接已断开，正在重连…' })
    this.scheduleReconnect()
    this.startPolling()
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.disposed || this.paused) return
    const delay = RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)]
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.disposed || this.paused) return
      this.connect()
    }, delay)
  }

  /* ------------------------------------------------------------- 兜底轮询 */

  private startPolling(): void {
    if (this.pollTimer || this.disposed || this.paused) return
    this.pollTimer = setInterval(() => {
      void this.loadSnapshot()
    }, FALLBACK_POLL_MS)
  }

  private stopPolling(): void {
    if (!this.pollTimer) return
    clearInterval(this.pollTimer)
    this.pollTimer = null
  }

  private stopTimers(): void {
    this.stopPolling()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private async loadSnapshot(): Promise<void> {
    if (this.snapshotLoading || this.disposed) return
    this.snapshotLoading = true
    try {
      const snapshot = await fetchSnapshot()
      if (this.disposed || this.paused) return
      if (!isSnapshot(snapshot)) {
        this.emitStatus({ message: '数据格式异常' })
        return
      }
      this.applySnapshot(snapshot)
      if (this.source) {
        // SSE 在线时以推送为准，兜底请求不改变在线状态
        this.emitStatus({ connected: true, message: null })
      } else {
        // 轮询兜底成功：数据可用但实时推送仍未恢复，保留降级提示
        this.emitStatus({ connected: true, message: '实时推送中断，已切换为 10 秒轮询兜底' })
      }
    } catch (err) {
      if (this.disposed || this.paused) return
      // 首次/兜底请求失败只更新状态，不向调用方抛出（避免打断大屏渲染）
      console.warn('[dataSource:http] 快照兜底请求失败', err)
      this.emitStatus({ connected: false, message: '暂时无法获取实时数据，请检查后端服务是否可用' })
    } finally {
      this.snapshotLoading = false
    }
  }

  /* --------------------------------------------------------------- 工具函数 */

  private applySnapshot(snapshot: Snapshot): void {
    // 丢弃比最后一帧更旧的快照（SSE 与兜底请求可能乱序到达）
    if (this.lastSnapshot && snapshot.simTime < this.lastSnapshot.simTime) return
    this.lastSnapshot = snapshot
    this.onSnapshot?.(snapshot)
  }

  private emitStatus(patch: { connected?: boolean; message?: string | null }): void {
    const next: DataSourceStatus = {
      mode: this.mode,
      connected: patch.connected ?? this.status.connected,
      message: patch.message !== undefined ? patch.message : this.status.message
    }
    const changed = next.connected !== this.status.connected || next.message !== this.status.message
    this.status = next
    if (changed) {
      for (const listener of [...this.listeners]) {
        try {
          listener(next)
        } catch (err) {
          console.warn('[dataSource:http] 状态订阅回调异常', err)
        }
      }
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(DATA_SOURCE_STATUS_EVENT, { detail: next }))
      }
    }
  }
}

export function createHttpDataSource(): DataSource {
  return new HttpDataSource()
}