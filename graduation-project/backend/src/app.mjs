/**
 * Express 唯一装配入口（T1 冻结文件，C-APP-WIRING@1）
 *
 * 中间件顺序（不可调整）：
 *   requestId → logger → cors/json → routes → notFoundJson → errorHandler
 *
 * 路由按 routes/index.mjs 的固定清单动态加载；文件缺失时跳过并 warn，
 * 保证并行开发期部分模块未就绪也能启动。未匹配任何路由的请求返回 JSON 404（禁止 HTML），
 * 且响应头始终带 X-Request-Id。
 *
 * 用法：
 *   const app = await createApp({ config, pool, simState })
 *   app.listen(config.port)
 */

import { existsSync } from 'node:fs'
import express from 'express'
import cors from 'cors'

import { config as defaultConfig } from './config.mjs'
import { getPool } from './db/pool.mjs'
import { REQUEST_ID_HEADER, requestId } from './middleware/requestId.mjs'
import { requestLogger } from './middleware/logger.mjs'
import { errorHandler, notFoundJson } from './middleware/error.mjs'
import {
  ROUTE_MOUNTS,
  resolveRouteModulePath,
  resolveRouteModuleUrl,
  sortBySpecificity
} from './routes/index.mjs'

/**
 * 构造 CORS 来源判定函数：仅放行白名单（支持 '*'），非浏览器请求（无 Origin）直接放行。
 * 不放行时只是不回 CORS 头，不抛错，避免影响服务端间调用与 curl 调试。
 * @param {ReadonlyArray<string>} allowList 允许的来源
 * @returns {(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void}
 */
function createOriginChecker(allowList) {
  return (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowList.includes('*') || allowList.includes(origin)) return callback(null, true)
    return callback(null, false)
  }
}

/**
 * 挂载单条路由清单项；模块缺失返回 false（由调用方打印 warn）。
 * @param {import('express').Express} app Express 应用
 * @param {{mount: string, module: string, owner: string, provides: string}} item 清单项
 * @param {{warn: Function, error: Function}} logger 日志器
 * @returns {Promise<boolean>} 是否成功挂载
 */
async function mountRoute(app, item, logger) {
  const modulePath = resolveRouteModulePath(item)

  if (!existsSync(modulePath)) {
    logger.warn(
      `[app] 路由模块尚未就绪，已跳过挂载：${item.mount} ← src/routes/${item.module.replace('./', '')}` +
        `（所有者 ${item.owner} · ${item.provides}）`
    )
    return false
  }

  let moduleNamespace
  try {
    moduleNamespace = await import(resolveRouteModuleUrl(item).href)
  } catch (error) {
    // 文件存在但无法加载属于真实故障（语法错误/依赖缺失），必须暴露而不是静默跳过。
    error.message = `[app] 加载路由模块失败：${item.module}（${error.message}）`
    throw error
  }

  const router = moduleNamespace.default ?? moduleNamespace.router
  if (typeof router !== 'function') {
    logger.warn(
      `[app] 路由模块未导出 express.Router（需 export default router），已跳过挂载：${item.mount}`
    )
    return false
  }

  app.use(item.mount, router)
  return true
}

/**
 * 创建并装配 Express 应用。
 *
 * @param {{
 *   config?: typeof defaultConfig,
 *   pool?: import('mysql2/promise').Pool,
 *   simState?: { getSnapshot: Function, getEngineMeta: Function } | null,
 *   logger?: Pick<Console, 'info' | 'warn' | 'error'>
 * }} [options] 装配依赖（默认取全局 config 与进程级连接池）
 * @returns {Promise<import('express').Express>} 已装配完成的 Express 应用
 */
export async function createApp(options = {}) {
  const cfg = options.config ?? defaultConfig
  const pool = options.pool ?? getPool(cfg)
  const simState = options.simState ?? null
  const logger = options.logger ?? console

  const app = express()
  app.disable('x-powered-by')

  // 供各路由模块复用（req.app.locals.pool / .simState / .config）
  app.locals.config = cfg
  app.locals.pool = pool
  app.locals.simState = simState

  // 1) 请求标识（必须最先执行，保证后续日志与错误响应都能带上 X-Request-Id）
  app.use(requestId)

  // 2) 访问日志（不记录请求体/请求头，天然规避口令与令牌泄漏）
  app.use(requestLogger)

  // 3) CORS + JSON 解析（请求体上限 100KB）
  app.use(
    cors({
      origin: createOriginChecker(cfg.corsOrigins),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', REQUEST_ID_HEADER],
      exposedHeaders: [REQUEST_ID_HEADER],
      credentials: false,
      maxAge: 600
    })
  )
  app.use(express.json({ limit: '100kb' }))

  // 4) 路由：具体路径优先挂载（/api/traffic/history 先于 /api/traffic）
  const mounted = []
  for (const item of sortBySpecificity(ROUTE_MOUNTS)) {
    const ok = await mountRoute(app, item, logger)
    if (ok) mounted.push(item)
  }
  app.locals.mountedRoutes = mounted
  app.locals.skippedRoutes = ROUTE_MOUNTS.filter(item => !mounted.includes(item))

  // 5) 未匹配 → JSON 404
  app.use(notFoundJson)

  // 6) 统一错误处理（必须最后注册）
  app.use(errorHandler)

  return app
}

export default createApp