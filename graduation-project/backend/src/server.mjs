/**
 * 进程入口（T1 冻结文件）
 *
 * 职责：
 * 1) 校验配置（config.mjs 内完成，非法直接 exit(1)）；
 * 2) 创建连接池并做一次数据库连通性探测 —— 失败只 warn，不阻止服务启动
 *    （T1 阶段无路由/无数据库时仍需可启动，数据库相关接口自行返回错误）；
 * 3) 动态加载 T6 的 collector.service（未就绪则跳过并 warn）；
 * 4) 装配 Express、监听 PORT；
 * 5) SIGINT/SIGTERM 优雅退出：停采集器 → 关 HTTP 服务 → 关连接池。
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from './config.mjs'
import { closePool, getPool, ping } from './db/pool.mjs'
import { createApp } from './app.mjs'

/** T6 提供的采集器模块（文件缺失时跳过启动） */
const COLLECTOR_MODULE_URL = new URL('./services/collector.service.mjs', import.meta.url)
/** 优雅退出总超时（毫秒） */
const SHUTDOWN_TIMEOUT_MS = 10_000
/** 采集器 flush 超时（毫秒），对应 C-COLLECTOR@1 "flush 待写队列 ≤5s" */
const COLLECTOR_FLUSH_TIMEOUT_MS = 5_000

/** 运行期句柄（供优雅退出使用） */
const runtime = {
  /** @type {import('node:http').Server | null} */
  server: null,
  /** @type {Record<string, unknown> | null} */
  collector: null
}

let shuttingDown = false

/** 简单延时 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 加载采集器模块；未就绪时返回空句柄并打印 warn。
 * @returns {Promise<{collector: Record<string, unknown> | null, simState: object | null}>}
 */
async function loadCollector() {
  const modulePath = fileURLToPath(COLLECTOR_MODULE_URL)
  if (!existsSync(modulePath)) {
    console.warn(
      '[server] 采集器模块尚未就绪（src/services/collector.service.mjs 由 T6 提供），已跳过启动；' +
        '依赖内存快照的接口将返回 COLLECTOR_NOT_READY。'
    )
    return { collector: null, simState: null }
  }

  try {
    const namespace = await import(COLLECTOR_MODULE_URL.href)
    const simState =
      typeof namespace.createSimStateReader === 'function' ? namespace.createSimStateReader() : null
    if (!simState) {
      console.warn('[server] collector.service 未导出 createSimStateReader，快照接口将不可用。')
    }
    return { collector: namespace, simState }
  } catch (error) {
    // 采集器属于并行开发中的模块，加载失败不阻塞骨架启动，但必须把原因打印出来。
    console.warn(
      `[server] 采集器模块加载失败，已跳过启动：${error instanceof Error ? error.message : String(error)}`
    )
    return { collector: null, simState: null }
  }
}

/**
 * 在指定端口启动 HTTP 服务，并把监听错误转成 Promise 拒绝。
 * @param {import('express').Express} app Express 应用
 * @param {number} port 端口
 * @returns {Promise<import('node:http').Server>}
 */
function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port)
    const onError = error => reject(error)
    server.once('error', onError)
    server.once('listening', () => {
      server.off('error', onError)
      resolve(server)
    })
  })
}

/**
 * 优雅退出：停采集器 → 关闭 HTTP 连接 → 关闭连接池；超时强制退出。
 * @param {string} signal 触发信号或原因
 * @param {number} [exitCode] 退出码
 * @returns {Promise<void>}
 */
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`[server] 收到 ${signal}，开始优雅退出…`)

  const forceTimer = setTimeout(() => {
    console.error('[server] 优雅退出超时，强制结束进程。')
    process.exit(exitCode === 0 ? 1 : exitCode)
  }, SHUTDOWN_TIMEOUT_MS)
  forceTimer.unref()

  try {
    if (runtime.collector && typeof runtime.collector.stop === 'function') {
      console.info('[server] 停止采集器并 flush 待写队列…')
      await Promise.race([
        Promise.resolve(runtime.collector.stop()),
        delay(COLLECTOR_FLUSH_TIMEOUT_MS).then(() => {
          console.warn('[server] 采集器 flush 超时，继续退出流程。')
        })
      ])
    }
  } catch (error) {
    console.warn(`[server] 停止采集器时出错：${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    if (runtime.server) {
      const closed = new Promise(resolve => runtime.server.close(() => resolve()))
      await Promise.race([closed, delay(3_000)])
      // SSE 等长连接会阻止 close 回调，强制释放剩余连接。
      if (typeof runtime.server.closeAllConnections === 'function') runtime.server.closeAllConnections()
    }
  } catch (error) {
    console.warn(`[server] 关闭 HTTP 服务时出错：${error instanceof Error ? error.message : String(error)}`)
  }

  try {
    await closePool()
  } catch (error) {
    console.warn(`[server] 关闭连接池时出错：${error instanceof Error ? error.message : String(error)}`)
  }

  clearTimeout(forceTimer)
  console.info('[server] 已停止。')
  process.exit(exitCode)
}

/**
 * 启动后端服务（导出以便测试复用）。
 * @returns {Promise<import('node:http').Server>}
 */
export async function startServer() {
  const pool = getPool(config)

  // 数据库探测：不可用时只警告，保持骨架可启动（T1 验收要求"无数据库也能启动"）。
  try {
    await ping(config)
    console.info(
      `[server] 数据库连接成功：${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `[server] 数据库连接失败（${message}）。服务仍将启动，但依赖数据库的接口会报错；` +
        '请确认 MySQL 已启动、.env 中 DB_* 正确，并执行 npm run db:init。'
    )
  }

  const { collector, simState } = await loadCollector()
  runtime.collector = collector

  const app = await createApp({ config, pool, simState })
  const mounted = app.locals.mountedRoutes ?? []
  const skipped = app.locals.skippedRoutes ?? []

  const server = await listen(app, config.port)
  runtime.server = server

  console.info(`[server] 交通大屏后端已启动：http://localhost:${config.port}（env=${config.env}）`)
  console.info(
    `[server] 路由挂载：${mounted.length} 个（${mounted.map(item => item.mount).join(', ') || '无'}）；` +
      `待就绪：${skipped.length} 个`
  )

  if (collector && typeof collector.start === 'function') {
    try {
      await collector.start()
      console.info('[server] 数据采集器已启动。')
    } catch (error) {
      console.warn(
        `[server] 数据采集器启动失败，服务继续运行：${error instanceof Error ? error.message : String(error)}`
      )
    }
  } else if (collector) {
    console.warn('[server] collector.service 未导出 start()，采集器未启动。')
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT', 0)
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM', 0)
  })
  process.on('uncaughtException', error => {
    console.error('[server] 未捕获异常：', error)
    void shutdown('uncaughtException', 1)
  })
  process.on('unhandledRejection', reason => {
    console.error('[server] 未处理的 Promise 拒绝：', reason)
    void shutdown('unhandledRejection', 1)
  })

  return server
}

// 直接执行本文件时启动服务；被测试 import 时不自动启动。
// Windows 下盘符大小写可能不一致，统一 normalize 后比较。
const currentFile = path.resolve(fileURLToPath(import.meta.url)).toLowerCase()
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : ''
const isDirectRun = invokedFile !== '' && currentFile === invokedFile

if (isDirectRun) {
  startServer().catch(error => {
    if (error && typeof error === 'object' && error.code === 'EADDRINUSE') {
      console.error(`[server] 端口 ${config.port} 已被占用，请修改 .env 中的 PORT 或释放该端口。`)
    } else {
      console.error('[server] 启动失败：', error)
    }
    process.exit(1)
  })
}