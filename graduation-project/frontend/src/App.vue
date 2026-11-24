<script setup lang="ts">
/**
 * 应用根组件：
 * - 仅渲染路由出口，不干预大屏版式（R-108）；
 * - 监听数据源状态广播，在 http 断连/降级时于页脚处显示**非遮挡式**中文提示，
 *   不需要改动 `ScreenView.vue` 或 store（T7 边界）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { DATA_SOURCE_STATUS_EVENT } from '@/services/httpDataSource'

interface DataSourceStatusDetail {
  mode?: string
  connected?: boolean
  message?: string | null
}

const degraded = ref(false)
const degradedMessage = ref('')

function handleStatusEvent(event: Event): void {
  const detail = (event as CustomEvent<DataSourceStatusDetail>).detail
  if (!detail || detail.mode !== 'http') {
    degraded.value = false
    degradedMessage.value = ''
    return
  }
  const offline = detail.connected === false
  degraded.value = offline
  degradedMessage.value = offline
    ? typeof detail.message === 'string' && detail.message.length > 0
      ? detail.message
      : '实时数据连接中断，正在尝试重连…'
    : ''
}

onMounted(() => {
  window.addEventListener(DATA_SOURCE_STATUS_EVENT, handleStatusEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener(DATA_SOURCE_STATUS_EVENT, handleStatusEvent)
})
</script>

<template>
  <router-view />
  <div v-if="degraded" class="ds-banner" role="status" aria-live="polite">
    <span class="ds-banner__dot" aria-hidden="true"></span>
    <span class="ds-banner__text">{{ degradedMessage }}</span>
  </div>
</template>

<style scoped>
.ds-banner {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  z-index: 3000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 80vw;
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 184, 0, 0.55);
  background: rgba(5, 8, 22, 0.88);
  box-shadow: 0 0 12px rgba(255, 184, 0, 0.25);
  color: #ffd873;
  font-size: 13px;
  letter-spacing: 0.02em;
  backdrop-filter: blur(6px);
  /* 不拦截鼠标事件，避免影响大屏交互 */
  pointer-events: none;
}

.ds-banner__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffb800;
  box-shadow: 0 0 8px rgba(255, 184, 0, 0.9);
  animation: ds-pulse 1.4s ease-in-out infinite;
}

.ds-banner__text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@keyframes ds-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}
</style>