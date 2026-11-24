import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
  type Ref,
  type WatchSource
} from 'vue'
import type { ECharts } from 'echarts/core'
import { init } from '@/chart/setup'

export interface UseEChartsOptions {
  optionFactory: () => unknown
  watchDeps: WatchSource[]
  mergeMode?: boolean
  onChartClick?: (params: any) => void
}

export function useECharts(domRef: Ref<HTMLElement | null>, options: UseEChartsOptions) {
  const instance = shallowRef<ECharts | null>(null)
  let observer: ResizeObserver | null = null
  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  const refresh = (): void => {
    instance.value?.setOption(options.optionFactory() as never, {
      notMerge: options.mergeMode === false
    })
  }

  const resize = (): void => {
    instance.value?.resize()
  }

  onMounted(() => {
    const el = domRef.value
    if (!el) return
    instance.value = init(el, 'neon')
    instance.value.setOption(options.optionFactory() as never)
    if (options.onChartClick) {
      instance.value.on('click', options.onChartClick)
    }
    observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        instance.value?.resize()
      }, 150)
    })
    observer.observe(el)
  })

  if (options.watchDeps.length > 0) {
    watch(options.watchDeps, refresh)
  }

  onBeforeUnmount(() => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
      resizeTimer = null
    }
    observer?.disconnect()
    observer = null
    instance.value?.dispose()
    instance.value = null
  })

  return { instance, refresh, resize }
}