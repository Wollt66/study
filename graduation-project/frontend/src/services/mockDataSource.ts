/**
 * mock 数据源：组合既有 `MockEngine` 实现 `DataSource`。
 *
 * 注意：本文件只**读取** `src/mock/**`，不得修改 mock 目录任何文件（R-901 边界）。
 */
import type { Snapshot } from '@/types'
import { MockEngine } from '@/mock/engine'
import { ENGINE_CONFIG } from '@/mock/constants'
import type { DataSource, DataSourceMeta, DataSourceMode, DataSourceStatus } from './dataSource'

class MockDataSource implements DataSource {
  readonly mode: DataSourceMode = 'mock'

  readonly meta: DataSourceMeta = {
    intervalMs: ENGINE_CONFIG.intervalMs,
    accel: ENGINE_CONFIG.accel
  }

  private engine: MockEngine | null = null
  private readonly listeners = new Set<(status: DataSourceStatus) => void>()
  private status: DataSourceStatus = { mode: 'mock', connected: true, message: null }
  private paused = false
  private onSnapshot: ((snapshot: Snapshot) => void) | null = null
  private lastSnapshot: Snapshot | null = null

  start(onSnapshot: (s: Snapshot) => void): void {
    this.onSnapshot = onSnapshot
    if (this.engine) {
      // 重复 start：直接补发最后一帧，避免引擎被重复启动
      if (this.lastSnapshot) onSnapshot(this.lastSnapshot)
      return
    }
    this.paused = false
    const engine = new MockEngine()
    this.engine = engine
    engine.start(snapshot => {
      this.lastSnapshot = snapshot
      this.onSnapshot?.(snapshot)
    })
    this.emitStatus({ connected: true, message: null })
  }

  pause(): void {
    if (!this.engine || this.paused) return
    this.paused = true
    this.engine.pause()
  }

  resume(): void {
    if (!this.engine || !this.paused) return
    this.paused = false
    this.engine.resume()
  }

  dispose(): void {
    this.engine?.dispose()
    this.engine = null
    this.paused = false
    this.lastSnapshot = null
    this.onSnapshot = null
    this.emitStatus({ connected: true, message: null })
    this.listeners.clear()
  }

  onStatus(cb: (s: DataSourceStatus) => void): () => void {
    this.listeners.add(cb)
    // 立即回放当前状态，订阅方无需等待下一次变更
    cb(this.status)
    return () => {
      this.listeners.delete(cb)
    }
  }

  private emitStatus(patch: { connected?: boolean; message?: string | null }): void {
    const next: DataSourceStatus = {
      mode: this.mode,
      connected: patch.connected ?? this.status.connected,
      message: patch.message !== undefined ? patch.message : this.status.message
    }
    if (next.connected === this.status.connected && next.message === this.status.message) return
    this.status = next
    for (const listener of [...this.listeners]) {
      try {
        listener(next)
      } catch (err) {
        console.warn('[dataSource:mock] 状态订阅回调异常', err)
      }
    }
  }
}

export function createMockDataSource(): DataSource {
  return new MockDataSource()
}