/**
 * 统一错误层（T1 冻结文件，C-ERROR@1）
 *
 * 响应体固定为：
 *   { code, message, requestId, details? }
 * 所有响应（含 404 与 500）都携带 X-Request-Id 头，值等于 requestId。
 * 错误日志记录 requestId + 方法 + 路径 + 错误栈，且一律经过脱敏，禁止出现口令/令牌原值。
 */

import { redactText, redactUrl } from './logger.mjs'
import { REQUEST_ID_HEADER, resolveRequestId } from './requestId.mjs'

/**
 * 错误码 → HTTP 状态与默认中文文案（与 §2.2.12 一一对应）。
 * 新增错误码必须同时补充到本表，避免出现"有 code 无状态"的隐式 500。
 */
export const ERROR_CODES = Object.freeze({
  VALIDATION_FAILED: { status: 400, message: '请求参数不合法' },
  BAD_REQUEST: { status: 400, message: '请求格式不正确' },
  UNAUTHENTICATED: { status: 401, message: '未提供访问令牌' },
  TOKEN_EXPIRED: { status: 401, message: '访问令牌已过期' },
  TOKEN_INVALID: { status: 401, message: '访问令牌无效' },
  INVALID_CREDENTIALS: { status: 401, message: '用户名或口令错误' },
  REFRESH_INVALID: { status: 401, message: '刷新令牌无效或已失效' },
  FORBIDDEN: { status: 403, message: '无访问权限' },
  NOT_FOUND: { status: 404, message: '接口不存在' },
  REGION_NOT_FOUND: { status: 404, message: '区域不存在' },
  CITY_NOT_FOUND: { status: 404, message: '城市不存在' },
  INTERSECTION_NOT_FOUND: { status: 404, message: '路口不存在' },
  REGION_ALREADY_EXISTS: { status: 409, message: '区域已存在' },
  REGION_IN_USE: { status: 409, message: '区域仍被引用，无法删除' },
  DUPLICATE_INTERSECTION_ID: { status: 409, message: '路口编号已存在' },
  ACCOUNT_LOCKED: { status: 423, message: '账号已锁定，请稍后再试' },
  INTERNAL_ERROR: { status: 500, message: '服务器内部错误' },
  COLLECTOR_NOT_READY: { status: 500, message: '采集器尚未就绪' },
  SERVICE_UNAVAILABLE: { status: 503, message: '服务暂不可用' }
})

/**
 * 业务错误：由路由/服务层抛出，交由 errorHandler 序列化。
 */
export class ApiError extends Error {
  /**
   * @param {keyof typeof ERROR_CODES} code 契约错误码
   * @param {string} [message] 自定义中文文案（默认取错误码约定文案）
   * @param {Array<{field: string, reason: string}>} [details] 字段级校验明细
   * @param {Record<string, unknown>} [extra] 需要合并进响应体的附加字段（如 lockedUntil）
   */
  constructor(code, message, details, extra = {}) {
    const definition = ERROR_CODES[code]
    super(message ?? definition?.message ?? '请求处理失败')
    this.name = 'ApiError'
    /** @type {keyof typeof ERROR_CODES | string} */
    this.code = code
    this.status = definition?.status ?? 500
    this.details = Array.isArray(details) ? details : undefined
    this.extra = extra && typeof extra === 'object' ? extra : {}
    Error.captureStackTrace?.(this, ApiError)
  }
}

/**
 * 构造业务错误（语法糖，便于服务层链式使用）。
 * @param {keyof typeof ERROR_CODES} code 契约错误码
 * @param {string} [message] 自定义文案
 * @param {Array<{field: string, reason: string}>} [details] 字段级明细
 * @param {Record<string, unknown>} [extra] 附加字段
 * @returns {ApiError}
 */
export function createError(code, message, details, extra) {
  return new ApiError(code, message, details, extra)
}

/**
 * 判断是否为业务错误。
 * @param {unknown} error 待判断对象
 * @returns {error is ApiError}
 */
export function isApiError(error) {
  return error instanceof ApiError
}

/**
 * 包装异步路由处理函数，把 Promise 拒绝转交 Express 错误中间件（Express 4 不会自动捕获）。
 * @template {import('express').RequestHandler} H
 * @param {H} handler 异步处理函数
 * @returns {import('express').RequestHandler}
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

/**
 * 组装错误响应体（不含 HTTP 状态）。
 * @param {unknown} error 异常对象
 * @param {string} requestId 请求标识
 * @returns {{status: number, body: Record<string, unknown>}}
 */
function toErrorResponse(error, requestId) {
  if (isApiError(error)) {
    const body = { code: error.code, message: error.message, requestId }
    if (error.details && error.details.length > 0) body.details = error.details
    Object.assign(body, error.extra)
    return { status: error.status, body }
  }

  // body-parser 抛出的错误（非法 JSON / 请求体过大）归类为 BAD_REQUEST
  if (error && typeof error === 'object' && typeof error.type === 'string') {
    if (error.type === 'entity.parse.failed') {
      return {
        status: 400,
        body: { code: 'BAD_REQUEST', message: '请求体不是合法的 JSON', requestId }
      }
    }
    if (error.type === 'entity.too.large') {
      return {
        status: 400,
        body: { code: 'BAD_REQUEST', message: '请求体超过 100KB 限制', requestId }
      }
    }
    if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') {
      return {
        status: 400,
        body: { code: 'BAD_REQUEST', message: '不支持的请求体编码', requestId }
      }
    }
  }

  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: '服务器内部错误', requestId }
  }
}

/**
 * 未匹配路由处理器：返回 JSON 404（禁止返回 HTML）。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function notFoundJson(req, res) {
  const requestId = req.requestId ?? resolveRequestId(req.headers?.[REQUEST_ID_HEADER.toLowerCase()])
  req.requestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)
  res
    .status(404)
    .type('application/json; charset=utf-8')
    .json({ code: 'NOT_FOUND', message: '接口不存在', requestId })
}

/**
 * 全局错误处理器（必须保留 4 个参数，Express 才识别为错误中间件）。
 * @param {unknown} error 异常
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function errorHandler(error, req, res, next) {
  const requestId = req.requestId ?? resolveRequestId()
  req.requestId = requestId

  const { status, body } = toErrorResponse(error, requestId)
  const method = req.method ?? '-'
  const path = redactUrl(req.originalUrl ?? req.url ?? '/')
  const detail =
    error instanceof Error ? redactText(error.stack ?? error.message) : redactText(String(error))

  // 4xx 归为警告，5xx 归为错误；两种情况都必须带 requestId 与堆栈，便于对照前端提示。
  const logLine = `[${new Date().toISOString()}] status=${status} code=${body.code} method=${method} path=${path} rid=${requestId}`
  if (status >= 500) {
    console.error(`ERROR ${logLine}\n${detail}`)
  } else {
    console.warn(`WARN  ${logLine} message=${body.message}`)
  }

  // 响应已开始发送时无法改写状态码与响应体，交回 Express 默认处理（关闭连接）。
  if (res.headersSent) {
    next(error)
    return
  }

  res.setHeader(REQUEST_ID_HEADER, requestId)
  res.status(status).type('application/json; charset=utf-8').json(body)
}

export default errorHandler