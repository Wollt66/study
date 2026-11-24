/**
 * 入参校验原语（T1 冻结文件，T2~T6 只可引用，不得修改）
 *
 * 冻结导出：
 *   validationError(details)  构造 400 VALIDATION_FAILED 错误对象
 *   requireFields(obj, spec)  按字段规则批量校验，失败聚合抛出（一次返回全部字段问题）
 *   parsePaging(query, opts)  分页参数解析 → { page, pageSize, offset }
 *   parseIntParam(value, name) 单值整数解析，非法抛 validationError
 *
 * spec 规则项（均可选，默认 required=true）：
 *   { type: 'int'|'number'|'string'|'enum'|'array'|'boolean', required?, enum?, min?, max?, length?, pattern? }
 */

import { ApiError } from '../middleware/error.mjs'

/**
 * 构造字段级校验错误。
 * @param {Array<{field: string, reason: string}> | string} details 明细数组或单条原因
 * @returns {ApiError}
 */
export function validationError(details) {
  const list = Array.isArray(details)
    ? details.filter(item => item && typeof item === 'object').map(item => ({
        field: String(item.field ?? ''),
        reason: String(item.reason ?? '参数不合法')
      }))
    : [{ field: '', reason: String(details ?? '参数不合法') }]
  return new ApiError('VALIDATION_FAILED', undefined, list)
}

/**
 * 判断数值是否为整数字面量。
 * @param {unknown} value 待判断值
 * @returns {boolean}
 */
function isIntegerValue(value) {
  return typeof value === 'number' && Number.isInteger(value)
}

/**
 * 十进制位数（用于"6 位行政区划码"这类长度规则）。
 * @param {number} value 整数
 * @returns {number}
 */
function digitLength(value) {
  return String(Math.abs(value)).length
}

/**
 * 校验单个字段，返回中文原因；合法返回 null。
 * @param {string} field 字段名
 * @param {unknown} value 字段值
 * @param {Record<string, unknown>} rule 规则
 * @returns {string | null}
 */
function checkField(field, value, rule) {
  const { type } = rule

  if (type === 'int') {
    if (!isIntegerValue(value)) return `${field} 必须为整数`
    if (rule.min !== undefined && value < rule.min) return `${field} 不得小于 ${rule.min}`
    if (rule.max !== undefined && value > rule.max) return `${field} 不得大于 ${rule.max}`
    if (rule.length !== undefined && digitLength(value) !== rule.length) {
      return `${field} 必须为 ${rule.length} 位数字`
    }
    if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
      return `${field} 只能取值为 ${rule.enum.join('/')}`
    }
    return null
  }

  if (type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return `${field} 必须为数字`
    if (rule.min !== undefined && value < rule.min) return `${field} 不得小于 ${rule.min}`
    if (rule.max !== undefined && value > rule.max) return `${field} 不得大于 ${rule.max}`
    return null
  }

  if (type === 'boolean') {
    if (typeof value !== 'boolean') return `${field} 必须为布尔值`
    return null
  }

  if (type === 'string') {
    if (typeof value !== 'string') return `${field} 必须为字符串`
    const length = [...value].length
    if (rule.min !== undefined && length < rule.min) return `${field} 长度不得小于 ${rule.min}`
    if (rule.max !== undefined && length > rule.max) return `${field} 长度不得大于 ${rule.max}`
    if (rule.length !== undefined && length !== rule.length) return `${field} 长度必须为 ${rule.length}`
    if (rule.pattern instanceof RegExp && !rule.pattern.test(value)) return `${field} 格式不合法`
    return null
  }

  if (type === 'enum') {
    if (!Array.isArray(rule.enum) || rule.enum.length === 0) {
      return `${field} 校验规则缺少枚举取值`
    }
    if (!rule.enum.includes(value)) return `${field} 只能取值为 ${rule.enum.join('/')}`
    return null
  }

  if (type === 'array') {
    if (!Array.isArray(value)) return `${field} 必须为数组`
    if (rule.length !== undefined && value.length !== rule.length) {
      return `${field} 必须包含 ${rule.length} 个元素`
    }
    if (rule.min !== undefined && value.length < rule.min) return `${field} 元素个数不得少于 ${rule.min}`
    if (rule.max !== undefined && value.length > rule.max) return `${field} 元素个数不得多于 ${rule.max}`
    return null
  }

  return `${field} 校验规则不合法（未知类型 ${String(type)}）`
}

/**
 * 按规则批量校验对象字段。
 *
 * - 缺省 required=true；required=false 时，字段缺失或空字符串视为"未提供"直接跳过；
 * - 全部字段校验完成后一次性抛出，details 按 spec 声明顺序排列；
 * - 不做类型转换，校验通过后原样返回传入对象（便于 `const body = requireFields(req.body, SPEC)`）。
 *
 * @param {unknown} obj 待校验对象（通常为 req.body）
 * @param {Record<string, Record<string, unknown>>} spec 字段规则表
 * @returns {Record<string, unknown>} 校验通过的对象
 */
export function requireFields(obj, spec) {
  const source = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
  const details = []

  for (const [field, rawRule] of Object.entries(spec ?? {})) {
    const rule = rawRule && typeof rawRule === 'object' ? rawRule : {}
    const required = rule.required !== false
    const value = source[field]
    const missing = value === undefined || value === null || value === ''

    if (missing) {
      if (required) details.push({ field, reason: `${field} 为必填项` })
      continue
    }

    const reason = checkField(field, value, rule)
    if (reason) details.push({ field, reason })
  }

  if (details.length > 0) throw validationError(details)
  return source
}

/**
 * 解析正整数参数（query/params 均为字符串）。
 * @param {unknown} value 原始值
 * @param {string} name 参数名（用于提示）
 * @returns {number}
 */
export function parseIntParam(value, name) {
  if (value === undefined || value === null || value === '') {
    throw validationError([{ field: name, reason: `${name} 为必填项` }])
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw validationError([{ field: name, reason: `${name} 必须为整数` }])
    }
    return value
  }
  const text = String(value).trim()
  // 只接受十进制整数字面量，拒绝 "1.0"、"1e3"、"0x10" 等歧义写法
  if (!/^[+-]?\d+$/.test(text)) {
    throw validationError([{ field: name, reason: `${name} 必须为整数` }])
  }
  const parsed = Number(text)
  if (!Number.isSafeInteger(parsed)) {
    throw validationError([{ field: name, reason: `${name} 超出安全整数范围` }])
  }
  return parsed
}

/**
 * 解析可选整数参数，缺省时返回 fallback。
 * @param {unknown} value 原始值
 * @param {string} name 参数名
 * @param {number} fallback 缺省值
 * @returns {number}
 */
function parseOptionalInt(value, name, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  return parseIntParam(value, name)
}

/**
 * 解析分页参数。
 * @param {unknown} query 请求 query（缺失时按默认分页处理）
 * @param {{defaultPageSize?: number, maxPageSize?: number}} [options] 分页约束
 * @returns {{page: number, pageSize: number, offset: number}}
 */
export function parsePaging(query, options = {}) {
  const defaultPageSize = options.defaultPageSize ?? 20
  const maxPageSize = options.maxPageSize ?? 100
  const source = query && typeof query === 'object' ? query : {}

  const page = parseOptionalInt(source.page, 'page', 1)
  const pageSize = parseOptionalInt(source.pageSize, 'pageSize', defaultPageSize)

  const details = []
  if (page < 1) details.push({ field: 'page', reason: 'page 必须大于等于 1' })
  if (pageSize < 1 || pageSize > maxPageSize) {
    details.push({ field: 'pageSize', reason: `pageSize 必须在 1~${maxPageSize} 之间` })
  }
  if (details.length > 0) throw validationError(details)

  return { page, pageSize, offset: (page - 1) * pageSize }
}