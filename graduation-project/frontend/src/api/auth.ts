/**
 * `C-AUTH@1` 契约客户端：只做请求与类型映射，不承载登录态（登录态在 `stores/auth.ts`）。
 */
import { get, post } from './client'

export interface AdminUser {
  id: number
  username: string
  displayName: string
  role: string
  lastLoginAt?: string | null
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: AdminUser
}

export interface RefreshResult {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface LogoutResult {
  revoked: boolean
}

/** `POST /api/auth/login`（匿名） */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', payload, { auth: false, skipRefresh: true })
}

/** `POST /api/auth/refresh`（匿名，凭 refreshToken；令牌轮换） */
export function refresh(refreshToken: string): Promise<RefreshResult> {
  return post<RefreshResult>('/auth/refresh', { refreshToken }, { auth: false, skipRefresh: true })
}

/** `POST /api/auth/logout`（需 Bearer；令牌不存在也返回 200，幂等） */
export function logout(refreshToken: string): Promise<LogoutResult> {
  return post<LogoutResult>('/auth/logout', { refreshToken }, { skipRefresh: true })
}

/** `GET /api/auth/me`（需 Bearer） */
export function fetchCurrentUser(): Promise<AdminUser> {
  return get<AdminUser>('/auth/me')
}