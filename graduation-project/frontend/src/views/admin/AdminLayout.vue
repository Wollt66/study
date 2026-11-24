<script setup lang="ts">
/**
 * 管理后台外壳（T7 占位，T8 在此文件上实现页面细节）。
 * 提供侧边导航、顶栏用户信息、退出登录与内容出口。
 */
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElAside,
  ElButton,
  ElContainer,
  ElHeader,
  ElMain,
  ElMenu,
  ElMenuItem,
  ElMessageBox
} from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : '管理后台'))

onMounted(() => {
  if (!auth.initialized && auth.isAuthenticated) {
    void auth.loadCurrentUser()
  }
})

async function handleLogout(): Promise<void> {
  try {
    await ElMessageBox.confirm('确认退出当前账号？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    // 用户取消
    return
  }
  await auth.logout()
  await router.replace('/login')
}
</script>

<template>
  <ElContainer class="admin-layout">
    <ElAside width="220px" class="admin-aside">
      <div class="admin-brand">
        <span class="admin-brand__dot"></span>
        <span class="admin-brand__text">交通监控 · 管理后台</span>
      </div>
      <ElMenu :default-active="activeMenu" router class="admin-menu">
        <ElMenuItem index="/admin/dashboard">看板概览</ElMenuItem>
        <ElMenuItem index="/admin/regions">区域管理</ElMenuItem>
        <ElMenuItem index="/admin/intersections">路口管理</ElMenuItem>
      </ElMenu>
      <div class="admin-aside__foot">数据源状态与降级提示见大屏</div>
    </ElAside>

    <ElContainer>
      <ElHeader class="admin-header">
        <span class="admin-header__title">{{ pageTitle }}</span>
        <div class="admin-header__right">
          <span class="admin-user">{{ auth.displayName }}</span>
          <ElButton link @click="router.push('/')">返回大屏</ElButton>
          <ElButton link type="danger" @click="handleLogout">退出登录</ElButton>
        </div>
      </ElHeader>
      <ElMain class="admin-main">
        <RouterView />
      </ElMain>
    </ElContainer>
  </ElContainer>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 12%, rgba(0, 240, 255, 0.08), transparent 40%),
    radial-gradient(circle at 88% 88%, rgba(255, 45, 149, 0.08), transparent 42%),
    var(--admin-bg, #050816);
}

.admin-aside {
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(0, 240, 255, 0.18);
  background: rgba(10, 16, 36, 0.86);
  backdrop-filter: blur(8px);
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 64px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0, 240, 255, 0.14);
  color: #e6f7ff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.admin-brand__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.9);
}

.admin-brand__text {
  white-space: nowrap;
}

.admin-menu {
  flex: 1;
  padding: 12px 8px;
  border-right: none;
  background: transparent;
}

.admin-aside__foot {
  padding: 12px 20px 20px;
  color: var(--text-muted, #9aa7c7);
  font-size: 11px;
  line-height: 1.6;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  border-bottom: 1px solid rgba(0, 240, 255, 0.14);
  background: rgba(5, 8, 22, 0.72);
  backdrop-filter: blur(8px);
}

.admin-header__title {
  color: #e6f7ff;
  font-size: 17px;
  font-weight: 600;
}

.admin-header__right {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.admin-user {
  color: #00f0ff;
}

.admin-main {
  padding: 20px;
}
</style>