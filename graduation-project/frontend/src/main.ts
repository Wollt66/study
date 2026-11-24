import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import '@/chart/setup'
import '@/styles/variables.css'
import '@/styles/base.css'
import '@/styles/neon-card.css'
import '@/styles/admin.css'
import { onSessionExpired } from '@/api/client'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus, { locale: zhCn })
app.use(router)

// 会话失效（刷新失败 / 令牌被吊销）：清理后跳转登录页，带上回跳地址
onSessionExpired(() => {
  const current = router.currentRoute.value
  if (current.path === '/login') return
  const requiresAuth = current.matched.some(record => record.meta.requiresAuth === true)
  void router.replace({
    path: '/login',
    query: requiresAuth ? { redirect: current.fullPath } : {}
  })
})

app.mount('#app')