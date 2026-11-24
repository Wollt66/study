/**
 * 登录态 store（`C-AUTH@1` 的消费方）。
 *
 * - 令牌持久化：`traffic.access_token` / `traffic.refresh_token`（由 `api/client.ts` 统一维护）
 * - 登录成功后写入令牌与当前用户；登出时先吊销刷新令牌再清空本地会话
 * - 订阅 client 的“会话失效”事件，保证刷新失败时界面状态同步清空（跳转由路由/入口处理）
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchCurrentUser, login as loginApi, logout as logoutApi, refresh as refreshApi } from '@/api/auth'
import type { AdminUser } from '@/api/auth'
import {
  ApiError,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  onSessionExpired,
  saveTokens
} from '@/api/client'

function formatLockedUntil(iso: string | null): string {
  if (!iso) return ''
  const time = new Date(iso)
  if (Number.isNaN(time.getTime())) return ''
  return time.toLocaleString('zh-CN', { hour12: false })
}

/** 登录失败的统一中文文案（R-302：不区分「账号不存在」与「口令错误」） */
function formatLoginError(err: ApiError | null): string {
  if (!err) return '登录失败，请稍后重试'
  switch (err.code) {
    case 'INVALID_CREDENTIALS':
      return '用户名或密码错误'
    case 'ACCOUNT_LOCKED': {
      const until = formatLockedUntil(err.lockedUntil)
      return until ? `账号已锁定，请于 ${until} 后重试` : '账号已锁定，请稍后再试'
    }
    case 'VALIDATION_FAILED':
      return '用户名或密码格式不正确'
    case 'NETWORK_ERROR':
      return '无法连接服务器，请确认后端服务已启动'
    case 'TIMEOUT':
      return '请求超时，请稍后重试'
    default:
      return err.message || '登录失败，请稍后重试'
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null)
  const accessToken = ref<string | null>(getAccessToken())
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorCode = ref<string | null>(null)
  /** 是否已完成一次会话恢复（避免后台壳重复拉取当前用户） */
  const initialized = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const displayName = computed(() => user.value?.displayName || user.value?.username || '管理员')
  const role = computed(() => user.value?.role ?? 'admin')

  function syncToken(): void {
    accessToken.value = getAccessToken()
  }

  /** 登录；返回是否成功（失败原因写入 `error`/`errorCode`） */
  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    errorCode.value = null
    try {
      const result = await loginApi({ username: username.trim(), password })
      saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
      accessToken.value = result.accessToken
      user.value = result.user
      initialized.value = true
      return true
    } catch (err) {
      const apiError = err instanceof ApiError ? err : ApiError.from(err)
      errorCode.value = apiError.code
      error.value = formatLoginError(apiError)
      return false
    } finally {
      loading.value = false
    }
  }

  /** 主动刷新令牌（供后台壳定时续期或手动重试） */
  async function refresh(): Promise<boolean> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearSession()
      return false
    }
    try {
      const result = await refreshApi(refreshToken)
      saveTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken })
      accessToken.value = result.accessToken
      return true
    } catch (err) {
      console.warn('[auth] 刷新令牌失败', err)
      clearSession()
      return false
    }
  }

  /** 拉取当前用户（页面刷新后恢复展示信息） */
  async function loadCurrentUser(): Promise<void> {
    if (!getAccessToken()) {
      user.value = null
      accessToken.value = null
      initialized.value = true
      return
    }
    try {
      user.value = await fetchCurrentUser()
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) clearSession()
      else console.warn('[auth] 获取当前用户失败', err)
    } finally {
      syncToken()
      initialized.value = true
    }
  }

  /** 登出：先尽力吊销刷新令牌，再无条件清空本地会话（幂等） */
  async function logout(): Promise<void> {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await logoutApi(refreshToken)
      } catch (err) {
        console.warn('[auth] 注销请求失败，仅清理本地会话', err)
      }
    }
    clearSession()
  }

  function clearSession(): void {
    clearTokens()
    accessToken.value = null
    user.value = null
    initialized.value = false
    loading.value = false
  }

  // 刷新失败 / 令牌被吊销：同步清空 store 状态（跳转由 router/main 处理）
  onSessionExpired(() => {
    accessToken.value = null
    user.value = null
    initialized.value = true
    errorCode.value = 'SESSION_EXPIRED'
    error.value = '登录已过期，请重新登录'
  })

  return {
    user,
    accessToken,
    loading,
    error,
    errorCode,
    initialized,
    isAuthenticated,
    displayName,
    role,
    login,
    refresh,
    loadCurrentUser,
    logout,
    clearSession,
    syncToken
  }
})