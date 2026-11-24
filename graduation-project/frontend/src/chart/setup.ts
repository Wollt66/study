import { use } from 'echarts/core'
import {
  BarChart,
  PieChart,
  LineChart,
  HeatmapChart,
  MapChart,
  EffectScatterChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  GeoComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { registerNeonTheme } from './theme'

use([
  BarChart,
  PieChart,
  LineChart,
  HeatmapChart,
  MapChart,
  EffectScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  GeoComponent,
  CanvasRenderer
])

registerNeonTheme()

export * from 'echarts/core'
export type { EChartsOption } from 'echarts'