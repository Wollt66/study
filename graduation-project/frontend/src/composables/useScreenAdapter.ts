import { computed, onBeforeUnmount, onMounted, reactive } from 'vue'

export function useScreenAdapter(designW = 1920, designH = 1080) {
  const state = reactive({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })

  let timer: ReturnType<typeof setTimeout> | null = null

  const compute = (): void => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const scale = Math.min(vw / designW, vh / designH)
    state.scale = scale
    state.offsetX = (vw - designW * scale) / 2
    state.offsetY = (vh - designH * scale) / 2
  }

  const onResize = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(compute, 100)
  }

  onMounted(() => {
    compute()
    window.addEventListener('resize', onResize)
    window.addEventListener('fullscreenchange', compute)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('fullscreenchange', compute)
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  const containerStyle = computed(() => ({
    position: 'fixed' as const,
    left: '0',
    top: '0',
    width: `${designW}px`,
    height: `${designH}px`,
    transform: `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`,
    transformOrigin: 'left top'
  }))

  return { containerStyle, adapter: state }
}