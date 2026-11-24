/**
 * 时间换算原语（T1 冻结文件，T2~T6 只可引用，不得修改）
 *
 * 冻结导出：
 *   alignTo(epochMs, minutes)     向下取整到 N 分钟边界，返回 epochMs
 *   toMySqlDateTime(epochMs)      → 'YYYY-MM-DD HH:mm:ss'（Asia/Shanghai）
 *   toIso(epochMs)                → ISO-8601 UTC 字符串
 *   parseIso(value, name)         ISO 字符串 → epochMs，非法抛 VALIDATION_FAILED
 *   shanghaiDateOf(epochMs)       → 'YYYY-MM-DD'
 *   shanghaiHourOf(epochMs)       → 0..23
 *
 * 时区口径：业务日期/小时一律按 Asia/Shanghai（中国无夏令时，固定 UTC+08:00），
 * 与 MySQL DATETIME 的写入口径保持一致；面向大屏的毫秒时间戳始终是 epoch ms。
 */

import { validationError } from './validate.mjs'

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const SHANGHAI_OFFSET_MS = 8 * MS_PER_HOUR

/** ISO-8601 白名单格式：日期、可选时间、可选时区 */
const ISO_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

/**
 * 断言入参为合法毫秒时间戳（内部辅助）。
 * @param {unknown} epochMs 待校验值
 * @param {string} [name] 参数名（用于错误提示）
 * @returns {number}
 */
function assertEpochMs(epochMs, name = 'time') {
  if (typeof epochMs !== 'number' || !Number.isFinite(epochMs)) {
    throw validationError([{ field: name, reason: `${name} 必须为毫秒时间戳` }])
  }
  return epochMs
}

/** 补零 */
function pad(value, width = 2) {
  return String(value).padStart(width, '0')
}

/**
 * 把上海本地时间拆成各字段。
 * @param {number} epochMs 毫秒时间戳
 * @returns {{year:number, month:number, day:number, hour:number, minute:number, second:number, millisecond:number}}
 */
function shanghaiParts(epochMs) {
  const shifted = new Date(epochMs + SHANGHAI_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds()
  }
}

/**
 * 向下对齐到 N 分钟边界（例如 5 分钟粒度快照）。
 * @param {number} epochMs 毫秒时间戳
 * @param {number} minutes 对齐粒度（正整数）
 * @returns {number} 对齐后的毫秒时间戳
 */
export function alignTo(epochMs, minutes) {
  const value = assertEpochMs(epochMs)
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw validationError([{ field: 'minutes', reason: '对齐粒度必须为正整数分钟' }])
  }
  const step = minutes * MS_PER_MINUTE
  return Math.floor(value / step) * step
}

/**
 * 毫秒时间戳 → MySQL DATETIME 字符串（Asia/Shanghai）。
 * @param {number} epochMs 毫秒时间戳
 * @returns {string} 'YYYY-MM-DD HH:mm:ss'
 */
export function toMySqlDateTime(epochMs) {
  const p = shanghaiParts(assertEpochMs(epochMs))
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

/**
 * 毫秒时间戳 → ISO-8601（UTC，毫秒精度）。
 * @param {number} epochMs 毫秒时间戳
 * @returns {string}
 */
export function toIso(epochMs) {
  return new Date(assertEpochMs(epochMs)).toISOString()
}

/**
 * ISO-8601 字符串 → 毫秒时间戳。
 *
 * 约定：不带时区后缀时按 UTC 解释（避免受服务器本地时区影响而出现 8 小时漂移）。
 * @param {unknown} value 原始字符串
 * @param {string} [name] 参数名（用于错误提示）
 * @returns {number} 毫秒时间戳
 */
export function parseIso(value, name = 'time') {
  if (typeof value !== 'string') {
    throw validationError([{ field: name, reason: `${name} 必须为 ISO-8601 时间字符串` }])
  }
  const text = value.trim()
  if (!ISO_PATTERN.test(text)) {
    throw validationError([
      { field: name, reason: `${name} 必须为 ISO-8601 时间字符串（如 2026-10-31T12:00:00.000Z）` }
    ])
  }
  let normalized = text.replace(' ', 'T')
  const hasTime = normalized.includes('T')
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized)
  if (!hasTime) normalized = `${normalized}T00:00:00`
  if (!hasZone) normalized = `${normalized}Z`
  const parsed = Date.parse(normalized)
  if (!Number.isFinite(parsed)) {
    throw validationError([{ field: name, reason: `${name} 不是可解析的时间` }])
  }
  return parsed
}

/**
 * 上海本地日期（Asia/Shanghai）。
 * @param {number} epochMs 毫秒时间戳
 * @returns {string} 'YYYY-MM-DD'
 */
export function shanghaiDateOf(epochMs) {
  const p = shanghaiParts(assertEpochMs(epochMs))
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/**
 * 上海本地小时（Asia/Shanghai）。
 * @param {number} epochMs 毫秒时间戳
 * @returns {number} 0..23
 */
export function shanghaiHourOf(epochMs) {
  return shanghaiParts(assertEpochMs(epochMs)).hour
}