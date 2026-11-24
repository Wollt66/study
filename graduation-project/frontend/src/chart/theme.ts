import { registerTheme } from 'echarts/core'

export const NEON_COLORS = [
  '#00F0FF',
  '#FF2D95',
  '#8A2BE2',
  '#00FFA3',
  '#FFB800',
  '#4DC3FF',
  '#FF6EC7'
]

export const FONT_BODY = "'Rajdhani', 'PingFang SC', 'Microsoft YaHei', sans-serif"
export const FONT_MONO = "'Share Tech Mono', 'Consolas', monospace"

let registered = false

export function registerNeonTheme(): void {
  if (registered) return
  registered = true
  registerTheme('neon', {
    color: NEON_COLORS,
    backgroundColor: 'transparent',
    textStyle: {
      fontFamily: FONT_BODY,
      color: '#C8D4F0'
    },
    legend: {
      textStyle: { color: '#C8D4F0' },
      inactiveColor: 'rgba(200, 212, 240, 0.35)',
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
      borderRadius: 3
    },
    tooltip: {
      backgroundColor: 'rgba(5, 8, 22, 0.88)',
      borderColor: 'rgba(0, 240, 255, 0.6)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#E8F0FF', fontFamily: FONT_BODY },
      extraCssText:
        'border-radius:8px;box-shadow:0 0 12px rgba(0,240,255,0.25);backdrop-filter:blur(4px);'
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: 'rgba(138, 43, 226, 0.4)' } },
      axisTick: { show: false },
      axisLabel: { color: '#9AA7C7', fontSize: 11 },
      splitLine: { show: false }
    },
    valueAxis: {
      axisLine: { show: false },
      axisLabel: { color: '#9AA7C7', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(0, 240, 255, 0.12)', type: 'dashed' } }
    },
    logBase: 10
  })
}