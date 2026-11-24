/**
 * 统一 HTTP 客户端（基于 fetch 的轻量封装，不引入 axios）。
 *
 * 设计要点：
 * 1. 全站唯一网络出口：统一拼装基址/查询串、序列化 JSON、超时与取消控制。
 * 2. 错误统一映射为 `ApiError`，字段与 `C-ERROR@1` 对齐（code / message / requestId / details）。
 * 3. 访问令牌过期（`401 + TOKEN_EXPIRED`）时自动刷新并**重放一次**原请求（R-303）；
 *    刷新失败则清除本地会话并通知订阅者（由路由层跳转登录页）。
 * 4. 令牌持久化键固定为 `traffic.access_token` / `traffic.refresh_token`（C-AUTH@1）。
 */

const DEFAULT_TIMEOUT_MS = 15_000

export const ACCESS_TOKEN_KEY = 'traffic.access_token'
export const REFRESH_TOKEN_KEY = 'traffic.refresh_token'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 查询串取值；`null`/`undefined`/空字符串按“未传”处理（契约中空 vehicleType 等同未传） */
export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

export interface ApiErrorDetail {
  field?: string
  reason?: string
  [key: string]: unknown
}

interface ApiErrorBody {
  code?: string
  message?: string
  requestId?: string
  details?: unknown
  lockedUntil?: string
}

/** `C-ERROR@1` 错误码 → 中文兜底文案（后端已返回中文 message 时优先使用后端文案） */
const CODE_MESSAGES: Record<string, string> = {
  BAD_REQUEST: '请求格式不正确',
  VALIDATION_FAILED: '请求参数不合法',
  UNAUTHENTICATED: '请先登录',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  TOKEN_INVALID: '登录凭证无效，请重新登录',
  INVALID_CREDENTIALS: '用户名或密码错误',
  REFRESH_INVALID: '登录已失效，请重新登录',
  FORBIDDEN: '没有访问权限',
  NOT_FOUND: '请求的资源不存在',
  REGION_NOT_FOUND: '区域不存在',
  CITY_NOT_FOUND: '城市不存在',
  INTERSECTION_NOT_FOUND: '路口不存在',
  REGION_ALREADY_EXISTS: '区域已存在',
  REGION_IN_USE: '区域存在引用，无法删除',
  DUPLICATE_INTERSECTION_ID: '路口编号已存在',
  ACCOUNT_LOCKED: '账号已锁定，请稍后再试',
  INTERNAL_ERROR: '服务端异常，请稍后重试',
  COLLECTOR_NOT_READY: '数据采集器尚未就绪，请稍后重试',
  SERVICE_UNAVAILABLE: '服务暂不可用，请稍后重试',
  TIMEOUT: '请求超时，请稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络或后端服务是否可用',
  ABORTED: '请求已取消',
  SESSION_EXPIRED: '登录状态已失效，请重新登录'
}

export function messageForCode(code: string, fallback?: string): string {
  return CODE_MESSAGES[code] ?? fallback ?? '请求失败，请稍后重试'
}

export interface ApiErrorInit {
  status: number
  code: string
  message: string
  requestId?: string | null
  details?: ApiErrorDetail[]
  lockedUntil?: string | null
}

/** 统一错误类型：所有网络/协议/业务错误都以该类型抛给上层 */
export class ApiError extends Error {
  /** HTTP 状态码；网络层错误为 0 */
  readonly status: number
  /** `C-ERROR@1` 错误码；网络层错误为 TIMEOUT / NETWORK_ERROR / ABORTED 等 */
  readonly code: string
  readonly requestId: string | null
  readonly details: ApiErrorDetail[]
  readonly lockedUntil: string | null

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.requestId = init.requestId ?? null
    this.details = init.details ?? []
    this.lockedUntil = init.lockedUntil ?? null
    // 修复 esbuild 降级到 ES5 时的 instanceof 判定
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  get isTokenExpired(): boolean {
    return this.status === 401 && this.code === 'TOKEN_EXPIRED'
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** 把任意异常收敛为 ApiError，便于界面统一展示 */
  static from(err: unknown, fallbackMessage = '请求失败，请稍后重试'): ApiError {
    if (err instanceof ApiError) return err
    if (err instanceof Error) {
      return new ApiError({ status: 0, code: 'UNKNOWN', message: err.message || fallbackMessage })
    }
    return new ApiError({ status: 0, code: 'UNKNOWN', message: fallbackMessage })
  }
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    // 隐私模式下 localStorage 可能抛错，此时退化为内存态
    return null
  }
}

const memoryTokens: { access: string | null; refresh: string | null } = {
  access: null,
  refresh: null
}

export function getAccessToken(): string | null {
  const storage = getStorage()
  if (!storage) return memoryTokens.access
  try {
    return storage.getItem(ACCESS_TOKEN_KEY) ?? memoryTokens.access
  } catch {
    return memoryTokens.access
  }
}

export function getRefreshToken(): string | null {
  const storage = getStorage()
  if (!storage) return memoryTokens.refresh
  try {
    return storage.getItem(REFRESH_TOKEN_KEY) ?? memoryTokens.refresh
  } catch {
    return memoryTokens.refresh
  }
}

export function hasAccessToken(): boolean {
  const token = getAccessToken()
  return typeof token === 'string' && token.length > 0
}

export interface TokenPair {
  accessToken: string
  refreshToken?: string
}

/** 写入令牌；refreshToken 缺省时保留原值（刷新响应总会带新值） */
export function saveTokens(tokens: TokenPair): void {
  memoryTokens.access = tokens.accessToken
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
      if (typeof tokens.refreshToken === 'string' && tokens.refreshToken.length > 0) {
        storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
      }
    } catch (err) {
      console.warn('[api] 本地令牌写入失败，本次会话仅保存在内存中', err)
    }
  }
  if (typeof tokens.refreshToken === 'string' && tokens.refreshToken.length > 0) {
    memoryTokens.refresh = tokens.refreshToken
  }
}

export function clearTokens(): void {
  memoryTokens.access = null
  memoryTokens.refresh = null
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(ACCESS_TOKEN_KEY)
    storage.removeItem(REFRESH_TOKEN_KEY)
  } catch (err) {
    console.warn('[api] 本地令牌清理失败', err)
  }
}

type SessionExpiredHandler = () => void

const sessionExpiredHandlers = new Set<SessionExpiredHandler>()

/** 订阅“会话失效”事件（刷新失败 / 令牌被吊销）；返回取消订阅函数 */
export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  sessionExpiredHandlers.add(handler)
  return () => {
    sessionExpiredHandlers.delete(handler)
  }
}

function handleSessionExpired(): void {
  clearTokens()
  for (const handler of [...sessionExpiredHandlers]) {
    try {
      handler()
    } catch (err) {
      console.warn('[api] 会话失效回调执行异常', err)
    }
  }
}

/** 读取 `VITE_API_BASE`（非浏览器/未注入 env 时安全回退默认值） */
function readEnvBase(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: { VITE_API_BASE?: string } }).env
  return typeof env?.VITE_API_BASE === 'string' ? env.VITE_API_BASE : undefined
}

/** `VITE_API_BASE`，缺省 `/api`；统一去掉尾部斜杠 */
export function apiBase(): string {
  const raw = readEnvBase() ?? '/api'
  const trimmed = raw.trim()
  if (trimmed.length === 0) return '/api'
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function buildQuery(query?: QueryParams): string {
  if (!query) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    search.append(key, String(value))
  }
  const serialized = search.toString()
  return serialized.length > 0 ? `?${serialized}` : ''
}

/** 拼装完整请求地址（基址 + 路径 + 查询串） */
export function apiUrl(path: string, query?: QueryParams): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBase()}${normalized}${buildQuery(query)}`
}

export interface RequestOptions {
  method?: HttpMethod
  query?: QueryParams
  body?: unknown
  /** false 时不携带访问令牌；缺省为“有令牌就携带” */
  auth?: boolean
  /** true 时禁用 401 自动刷新（登录/刷新/登出接口必须关闭） */
  skipRefresh?: boolean
  timeoutMs?: number
  signal?: AbortSignal
  headers?: Record<string, string>
}

interface RefreshResult {
  accessToken?: string
  refreshToken?: string
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * 刷新访问令牌（并发请求共享同一次刷新，避免刷新令牌轮换导致的互相失效）。
 * 失败时清除会话并触发 `onSessionExpired` 订阅者。
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    handleSessionExpired()
    return false
  }
  try {
    const data = await send<RefreshResult>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      skipRefresh: true,
      timeoutMs: 10_000
    })
    if (!data || typeof data.accessToken !== 'string' || data.accessToken.length === 0) {
      throw new ApiError({ status: 0, code: 'REFRESH_INVALID', message: '刷新响应缺少访问令牌' })
    }
    saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    return true
  } catch (err) {
    console.warn('[api] 刷新访问令牌失败，已清除本地会话', err instanceof ApiError ? `${err.code}: ${err.message}` : err)
    handleSessionExpired()
    return false
  }
}

function normalizeDetails(raw: unknown): ApiErrorDetail[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is ApiErrorDetail => typeof item === 'object' && item !== null)
}

async function parseResponse<T>(response: Response): Promise<T> {
  const headerRequestId = response.headers.get('X-Request-Id')
  let text = ''
  try {
    text = await response.text()
  } catch {
    text = ''
  }
  let payload: unknown = null
  if (text.trim().length > 0) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }
  if (!response.ok) {
    const body: ApiErrorBody = payload !== null && typeof payload === 'object' ? (payload as ApiErrorBody) : {}
    const code = typeof body.code === 'string' && body.code.length > 0 ? body.code : `HTTP_${response.status}`
    const message =
      typeof body.message === 'string' && body.message.length > 0
        ? body.message
        : messageForCode(code, `请求失败（HTTP ${response.status}）`)
    throw new ApiError({
      status: response.status,
      code,
      message,
      requestId: typeof body.requestId === 'string' ? body.requestId : headerRequestId,
      details: normalizeDetails(body.details),
      lockedUntil: typeof body.lockedUntil === 'string' ? body.lockedUntil : null
    })
  }
  if (response.status === 204 || text.trim().length === 0) return undefined as T
  if (payload === null) {
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: '服务端返回了非 JSON 响应',
      requestId: headerRequestId
    })
  }
  return payload as T
}

async function send<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const url = apiUrl(path, options.query)
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers ?? {}) }

  const token = options.auth === false ? null : getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: string | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8'
    payload = JSON.stringify(options.body)
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const externalSignal = options.signal
  const forwardAbort = (): void => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', forwardAbort, { once: true })
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: payload,
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin'
    })
    return await parseResponse<T>(response)
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: 'TIMEOUT',
        message: `请求超时（${Math.round(timeoutMs / 1000)} 秒），请稍后重试`
      })
    }
    if (externalSignal?.aborted) {
      throw new ApiError({ status: 0, code: 'ABORTED', message: '请求已取消' })
    }
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: messageForCode('NETWORK_ERROR') })
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', forwardAbort)
  }
}

/**
 * 发起请求。
 * 若服务端返回 `401 + TOKEN_EXPIRED`，则刷新令牌后**重放一次**；刷新失败抛 SESSION_EXPIRED。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options)
  } catch (err) {
    if (err instanceof ApiError && err.isTokenExpired && !options.skipRefresh) {
      const refreshed = await refreshSession()
      if (refreshed) return send<T>(path, options)
      throw new ApiError({
        status: 401,
        code: 'SESSION_EXPIRED',
        message: messageForCode('SESSION_EXPIRED'),
        requestId: err.requestId
      })
    }
    throw err
  }
}

export function get<T>(path: string, query?: QueryParams, options: Omit<RequestOptions, 'method' | 'query'> = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'GET', query })
}

export function post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body })
}

export function put<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'PUT', body })
}

export function del<T>(path: string, query?: QueryParams, options: Omit<RequestOptions, 'method' | 'query'> = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE', query })
}