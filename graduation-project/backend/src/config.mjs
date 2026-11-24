/**
 * 统一配置入口（T1 冻结文件，T2~T6 只能引用导出，不得修改）
 *
 * 职责：
 * 1) 读取 毕业设计/backend/.env（dotenv；shell 中已存在的同名变量优先，便于临时覆盖）；
 * 2) 校验必填项（DB_* 与 JWT_SECRET 长度 >= 32），缺失/非法时输出中文提示并 process.exit(1)；
 * 3) 导出深度冻结的配置对象，禁止运行期被篡改。
 *
 * 安全约束：本文件禁止硬编码任何真实口令或密钥，所有敏感值只能来自环境变量。
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

/** 后端工程根目录（毕业设计/backend） */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
/** 默认环境变量文件路径 */
export const ENV_FILE_PATH = path.join(BACKEND_ROOT, '.env')
/** JWT 密钥最小长度（C-AUTH@1 约定） */
export const MIN_JWT_SECRET_LENGTH = 32

// .env 不存在时 dotenv 不报错，交由下方必填校验给出中文提示。
dotenv.config({ path: ENV_FILE_PATH })

/** @type {string[]} 收集全部配置问题，一次性反馈给使用者 */
const problems = []

function readRaw(name) {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 读取必填字符串变量。
 * @param {string} name 环境变量名
 * @param {string} hint 缺失时补充的说明
 * @returns {string}
 */
function readRequired(name, hint) {
  const value = readRaw(name)
  if (value === '') {
    problems.push(`${name} 未配置（${hint}）`)
  }
  return value
}

/**
 * 读取必填但允许空值的变量（例如本地无口令的 MySQL 实例）。
 * 变量必须"存在"，值为空字符串视为合法。
 * @param {string} name 环境变量名
 * @param {string} hint 缺失时补充的说明
 * @returns {string}
 */
function readRequiredAllowEmpty(name, hint) {
  if (process.env[name] === undefined) {
    problems.push(`${name} 未配置（${hint}；无口令实例请显式写 ${name}=）`)
    return ''
  }
  return String(process.env[name])
}

/**
 * 读取整数变量。
 * @param {string} name 环境变量名
 * @param {number} fallback 缺省值
 * @param {{min?: number, max?: number}} [range] 取值范围
 * @returns {number}
 */
function readInt(name, fallback, range = {}) {
  const raw = readRaw(name)
  if (raw === '') return fallback
  if (!/^-?\d+$/.test(raw)) {
    problems.push(`${name} 必须为整数，当前值为 "${raw}"`)
    return fallback
  }
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) {
    problems.push(`${name} 超出安全整数范围，当前值为 "${raw}"`)
    return fallback
  }
  if (range.min !== undefined && value < range.min) {
    problems.push(`${name} 不得小于 ${range.min}，当前值为 ${value}`)
    return fallback
  }
  if (range.max !== undefined && value > range.max) {
    problems.push(`${name} 不得大于 ${range.max}，当前值为 ${value}`)
    return fallback
  }
  return value
}

/** 递归冻结对象，保证配置在运行期只读 */
function deepFreeze(target) {
  for (const value of Object.values(target)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value)
  }
  return Object.freeze(target)
}

const nodeEnv = readRaw('NODE_ENV') || 'development'
const port = readInt('PORT', 3001, { min: 1, max: 65535 })
const dbPort = readInt('DB_PORT', 3306, { min: 1, max: 65535 })
const dbPoolSize = readInt('DB_POOL_SIZE', 10, { min: 1, max: 100 })
const accessTokenTtl = readInt('ACCESS_TOKEN_TTL', 7200, { min: 60, max: 86400 })
const refreshTokenTtl = readInt('REFRESH_TOKEN_TTL', 604800, { min: 60, max: 31536000 })
const collectIntervalMs = readInt('COLLECT_INTERVAL_MS', 5000, { min: 1000, max: 3600000 })
const simSeed = readInt('SIM_SEED', 20260501)

const dbHost = readRequired('DB_HOST', '例如 127.0.0.1')
const dbUser = readRequired('DB_USER', '例如 root')
const dbPassword = readRequiredAllowEmpty('DB_PASSWORD', '数据库账号口令')
const dbName = readRequired('DB_NAME', '默认 traffic_screen')
const jwtSecret = readRequired('JWT_SECRET', '可用 node -e 生成 32 字节随机十六进制串')

if (dbName !== '' && !/^[A-Za-z0-9_]{1,64}$/.test(dbName)) {
  problems.push(`DB_NAME 只能包含字母、数字与下划线（1~64 字符），当前值为 "${dbName}"`)
}

if (jwtSecret !== '' && jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
  problems.push(
    `JWT_SECRET 长度不足 ${MIN_JWT_SECRET_LENGTH} 个字符（当前 ${jwtSecret.length} 个），` +
      '请生成足够随机的密钥后重试'
  )
}

const corsOrigin = readRaw('CORS_ORIGIN') || 'http://localhost:5173'
const corsOrigins = Array.from(
  new Set(
    corsOrigin
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  )
)

if (corsOrigins.length === 0) {
  problems.push('CORS_ORIGIN 不能为空，例如 http://localhost:5173')
}

const adminInitUsername = readRaw('ADMIN_INIT_USERNAME') || 'admin'
const adminInitPassword = process.env.ADMIN_INIT_PASSWORD ?? ''

if (adminInitUsername.length > 64) {
  problems.push(`ADMIN_INIT_USERNAME 长度不得超过 64 个字符（当前 ${adminInitUsername.length} 个）`)
}

// 所有问题一次性反馈，避免使用者反复试错。
if (problems.length > 0) {
  console.error('')
  console.error('[配置错误] 后端无法启动，请修正以下配置项：')
  for (const item of problems) console.error(`  - ${item}`)
  console.error('')
  console.error(`配置文件路径：${ENV_FILE_PATH}`)
  console.error('提示：可复制 .env.example 为 .env 后填写，切勿把真实口令提交到仓库。')
  console.error('')
  process.exit(1)
}

// 安全提示（不阻止启动）：示例密钥只适合本地联调。
if (/^(please|change|replace|example|demo)/i.test(jwtSecret) || jwtSecret === 'a'.repeat(jwtSecret.length)) {
  console.warn('[配置警告] JWT_SECRET 仍为示例风格的值，正式环境必须替换为随机密钥。')
}
if (adminInitPassword === '') {
  console.warn('[配置警告] ADMIN_INIT_PASSWORD 为空，npm run db:init 将无法创建管理员账号。')
}
if (dbPassword === '') {
  console.warn('[配置警告] DB_PASSWORD 为空，仅适用于本地无口令的 MySQL 实例。')
}

/** 冻结后的配置对象（运行期只读） */
export const config = deepFreeze({
  env: nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  corsOrigin,
  corsOrigins,
  db: {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    name: dbName,
    poolSize: dbPoolSize,
    charset: 'utf8mb4'
  },
  jwtSecret,
  jwtIssuer: readRaw('JWT_ISSUER') || 'traffic-screen',
  /** 单位：秒（与 JWT expiresIn 一致） */
  accessTokenTtl,
  /** 单位：秒（C-AUTH@1 默认 7 天） */
  refreshTokenTtl,
  collectIntervalMs,
  simSeed,
  adminInitUsername,
  adminInitPassword
})

export default config