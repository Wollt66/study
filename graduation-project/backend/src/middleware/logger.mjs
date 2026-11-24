/**
 * 访问日志与脱敏（T1 冻结文件）
 *
 * 安全红线（R-803）：日志中不得出现 password、authorization、refreshToken 等原值。
 * 本模块的策略是"默认不记录请求体与请求头"，只记录方法/路径/状态/耗时/requestId/来源 IP；
 * 同时提供 redact()/redactText() 供其他任务在必须记录对象或错误信息时复用。
 */

const URL_SENSITIVE_KEYS = ['password', 'pwd', 'token', 'accesstoken', 'access_token', 'refreshtoken', 'refresh_token', 'secret', 'authorization']

/** 敏感键名判定（大小写不敏感，包含匹配） */
const SENSITIVE_KEY_PATTERN = /^(password|passwd|pwd|token|authorization|cookie|secret|access_?token|refresh_?token|jwt_secret)$/i

/**
 * 对象脱敏：命中敏感键名的值替换为 '***'，递归处理数组与嵌套对象。
 * @param {unknown} value 待脱敏数据
 * @param {number} [depth] 当前递归深度（防止超深结构拖慢日志）
 * @param {WeakSet<object>} [seen] 循环引用保护
 * @returns {unknown}
 */
export function redact(value, depth = 0, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value
  if (depth > 6) return '[depth-limit]'
  if (seen.has(value)) return '[circular]'
  seen.add(value)

  if (Array.isArray(value)) {
    return value.slice(0, 50).map(item => redact(item, depth + 1, seen))
  }

  const output = {}
  for (const [key, item] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key) ? '***' : redact(item, depth + 1, seen)
  }
  return output
}

/**
 * 文本脱敏：处理错误堆栈/字符串里的 key=value 形式敏感信息。
 * @param {string} text 原始文本
 * @returns {string}
 */
export function redactText(text) {
  if (typeof text !== 'string') return ''
  return text.replace(
    /\b(password|passwd|pwd|token|authorization|refresh_?token|access_?token|secret)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&}]+)/gi,
    (_match, key, separator) => `${key}${separator}***`
  )
}

/**
 * 路径脱敏：对查询串中的敏感参数值打码（避免 ?refreshToken=... 进入日志）。
 * @param {string} originalUrl 原始 URL
 * @returns {string}
 */
export function redactUrl(originalUrl) {
  if (typeof originalUrl !== 'string' || originalUrl === '') return '/'
  const [pathname, queryString] = originalUrl.split('?')
  if (!queryString) return pathname || '/'
  const safeQuery = queryString
    .split('&')
    .map(pair => {
      const [rawKey, rawValue = ''] = pair.split('=')
      const key = rawKey.toLowerCase()
      const sensitive = URL_SENSITIVE_KEYS.includes(key.replace(/[-_]/g, '')) || /password|secret/i.test(key)
      return sensitive ? `${rawKey}=***` : `${rawKey}=${rawValue}`
    })
    .join('&')
  return `${pathname}?${safeQuery}`
}

/** 获取客户端来源 IP（仅用于日志，不做信任判断） */
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded !== '') return forwarded.split(',')[0].trim()
  return req.ip ?? req.socket?.remoteAddress ?? '-'
}

/**
 * Express 中间件：请求完成时输出一行访问日志。
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint()
  let logged = false

  const write = event => {
    if (logged) return
    logged = true
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    const line = [
      `[${new Date().toISOString()}]`,
      'INFO ',
      req.method,
      redactUrl(req.originalUrl ?? req.url ?? '/'),
      res.statusCode,
      `${durationMs.toFixed(1)}ms`,
      `rid=${req.requestId ?? '-'}`,
      `ip=${clientIp(req)}`,
      event
    ].join(' ')
    console.info(line)
  }

  res.on('finish', () => write(''))
  res.on('close', () => {
    if (!res.writableEnded) write('(client-aborted)')
  })

  next()
}

export default requestLogger