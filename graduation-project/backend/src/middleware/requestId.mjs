/**
 * 请求标识中间件（T1 冻结文件，C-ERROR@1）
 *
 * 规则：
 * - 优先复用调用方传入的 X-Request-Id（便于前端/网关链路追踪），但只接受
 *   [A-Za-z0-9._-]{1,64}，防止日志注入；
 * - 缺失或非法时生成 UUID v4；
 * - requestId 写入 req.requestId，并立即回写响应头 X-Request-Id，
 *   保证 404/500 等错误响应同样携带该头。
 */

import { randomUUID } from 'node:crypto'

export const REQUEST_ID_HEADER = 'X-Request-Id'

/** 仅允许安全字符，长度上限 64 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/

/**
 * 规范化请求标识：非法值返回 null。
 * @param {unknown} value 请求头原始值
 * @returns {string | null}
 */
export function normalizeRequestId(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return SAFE_REQUEST_ID.test(trimmed) ? trimmed : null
}

/**
 * 生成请求标识（供无中间件场景，如错误日志兜底使用）。
 * @param {unknown} [incoming] 原始请求头值
 * @returns {string}
 */
export function resolveRequestId(incoming) {
  return normalizeRequestId(incoming) ?? randomUUID()
}

/**
 * Express 中间件：为每个请求分配 requestId。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function requestId(req, res, next) {
  const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()]
  const id = resolveRequestId(Array.isArray(incoming) ? incoming[0] : incoming)
  req.requestId = id
  res.setHeader(REQUEST_ID_HEADER, id)
  next()
}

export default requestId