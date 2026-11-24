/**
 * MySQL 连接池封装（T1 冻结文件）
 *
 * 约定：
 * - 进程级单例连接池，首次调用 getPool() 时惰性创建（mysql2 创建池不会立即建连）；
 * - 统一字符集 utf8mb4、时区 +08:00（Asia/Shanghai 业务口径）、dateStrings=true
 *   （DATETIME 以字符串返回，避免不同服务器时区导致的时间漂移）、
 *   decimalNumbers=true（DECIMAL 直接返回 number，符合契约数值口径）；
 * - 提供 query/execute/withTransaction/ping/closePool 辅助，业务层不得自行 createConnection。
 *
 * 注意：本模块 import 了 config.mjs，因此配置非法时会在此处直接终止进程（符合启动期校验要求）。
 */

import mysql from 'mysql2/promise'
import { config as defaultConfig } from '../config.mjs'

/** @type {import('mysql2/promise').Pool | null} */
let pool = null

/**
 * 创建连接池（不建立实际连接）。
 * @param {typeof defaultConfig} [cfg] 配置对象，默认使用全局 config
 * @returns {import('mysql2/promise').Pool}
 */
export function createPool(cfg = defaultConfig) {
  return mysql.createPool({
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    database: cfg.db.name,
    charset: cfg.db.charset,
    connectionLimit: cfg.db.poolSize,
    maxIdle: cfg.db.poolSize,
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10_000,
    // 业务时间统一按东八区解释；DATETIME 以字符串返回，交由上层显式转换。
    timezone: '+08:00',
    dateStrings: true,
    decimalNumbers: true
  })
}

/**
 * 获取进程级连接池单例。
 * @param {typeof defaultConfig} [cfg] 配置对象，默认使用全局 config
 * @returns {import('mysql2/promise').Pool}
 */
export function getPool(cfg = defaultConfig) {
  if (!pool) pool = createPool(cfg)
  return pool
}

/**
 * 执行 SQL（文本协议，支持多行/批量 INSERT）。
 * @param {string} sql SQL 文本
 * @param {unknown[]} [params] 占位参数
 * @param {typeof defaultConfig} [cfg] 配置对象
 * @returns {Promise<unknown>} 查询结果行（SELECT）或 ResultSetHeader（写操作）
 */
export async function query(sql, params = [], cfg = defaultConfig) {
  const [rows] = await getPool(cfg).query(sql, params)
  return rows
}

/**
 * 执行 SQL（预处理语句协议，参数化 DML 优先使用本方法）。
 * @param {string} sql SQL 文本
 * @param {unknown[]} [params] 占位参数
 * @param {typeof defaultConfig} [cfg] 配置对象
 * @returns {Promise<unknown>} 查询结果行（SELECT）或 ResultSetHeader（写操作）
 */
export async function execute(sql, params = [], cfg = defaultConfig) {
  const [rows] = await getPool(cfg).execute(sql, params)
  return rows
}

/**
 * 在单个连接上执行事务，异常自动回滚。
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} handler 事务体
 * @param {typeof defaultConfig} [cfg] 配置对象
 * @returns {Promise<T>}
 */
export async function withTransaction(handler, cfg = defaultConfig) {
  const conn = await getPool(cfg).getConnection()
  try {
    await conn.beginTransaction()
    const result = await handler(conn)
    await conn.commit()
    return result
  } catch (error) {
    try {
      await conn.rollback()
    } catch (rollbackError) {
      // 回滚失败只记录，不覆盖原始异常，便于定位根因。
      console.error('[db] 事务回滚失败：', rollbackError instanceof Error ? rollbackError.message : rollbackError)
    }
    throw error
  } finally {
    conn.release()
  }
}

/**
 * 健康检查：执行 SELECT 1。
 * @param {typeof defaultConfig} [cfg] 配置对象
 * @returns {Promise<true>}
 */
export async function ping(cfg = defaultConfig) {
  await query('SELECT 1 AS ok', [], cfg)
  return true
}

/**
 * 关闭连接池（幂等，供优雅退出调用）。
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (!pool) return
  const current = pool
  pool = null
  await current.end()
}

/**
 * 连接池是否已创建（不保证可用）。
 * @returns {boolean}
 */
export function hasPool() {
  return pool !== null
}