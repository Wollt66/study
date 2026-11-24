/**
 * 路由表与全局守卫 —— `C-ROUTES@1` 实现。
 *
 * 说明：
 * - 保留 `createWebHashHistory`（离线分发零配置，NFR-07）；
 * - `/`、`/about` 为大屏公开路由，零改动；
 * - `/login` 公开（已登录访问重定向 `/admin/dashboard`）；
 * - `/admin/**` 需登录：无 `traffic.access_token` → `/login?redirect=<fullPath>`。
 */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { hasAccessToken } from '@/api/client'

const ADMIN_HOME = '/admin/dashboard'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'screen',
    component: () => import('@/views/ScreenView.vue'),
    meta: { title: '城市交通监控可视化大屏' }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: '系统说明' }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录 · 管理后台' }
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true, title: '管理后台' },
    redirect: ADMIN_HOME,
    children: [
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/DashboardView.vue'),
        meta: { title: '看板概览' }
      },
      {
        path: 'regions',
        name: 'admin-regions',
        component: () => import('@/views/admin/RegionManageView.vue'),
        meta: { title: '区域管理' }
      },
      {
        path: 'intersections',
        name: 'admin-intersections',
        component: () => import('@/views/admin/IntersectionManageView.vue'),
        meta: { title: '路口管理' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(to => {
  const loggedIn = hasAccessToken()

  // 已登录访问登录页 → 直接进后台
  if (to.name === 'login') {
    return loggedIn ? { path: ADMIN_HOME } : true
  }

  // 需要鉴权的路由：登录态以 localStorage 中的 access token 为准（C-ROUTES@1）
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth === true)
  if (requiresAuth && !loggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  return true
})

router.afterEach(to => {
  const title = to.meta.title
  if (typeof title === 'string' && title.length > 0) {
    document.title = title
  }
})

export default router