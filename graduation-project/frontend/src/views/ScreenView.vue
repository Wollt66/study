<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import ScreenLayout from '@/components/ScreenLayout.vue'
import TimeClock from '@/components/TimeClock.vue'
import ControlBar from '@/components/ControlBar.vue'
import FilterTagBar from '@/components/FilterTagBar.vue'
import KpiCard from '@/components/KpiCard.vue'
import MapChart from '@/components/charts/MapChart.vue'
import IntersectionRankChart from '@/components/charts/IntersectionRankChart.vue'
import AccidentPieChart from '@/components/charts/AccidentPieChart.vue'
import VehicleRingChart from '@/components/charts/VehicleRingChart.vue'
import CongestionTrendChart from '@/components/charts/CongestionTrendChart.vue'
import HourFlowHeatChart from '@/components/charts/HourFlowHeatChart.vue'
import { useScreenStore } from '@/stores/screen'
import type { FilterTag, VehicleTypeCode } from '@/types'
import router from '@/router'

const store = useScreenStore()

const mapLevel = computed<'country' | 'province' | 'city'>(() => {
  const stack = store.regionStack
  if (stack.length === 1) return 'country'
  return stack.length === 2 ? 'province' : 'city'
})

const mapName = computed(() => String(store.regionStack[store.regionStack.length - 1]))

const regionLabel = computed(() => store.currentRegion?.name ?? '全国')

const totalVehicles = computed(() => store.currentRegion?.activeVehicles ?? 0)

let tipTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => store.mapMissingTip,
  tip => {
    if (tipTimer) clearTimeout(tipTimer)
    if (tip) {
      tipTimer = setTimeout(() => store.dismissMapTip(), 4000)
    }
  }
)

const onRemoveTag = (dimension: FilterTag['dimension']): void => {
  store.removeFilter(dimension)
}

const onAccidentTypeSelect = (payload: { typeCode: string }): void => {
  store.selectAccidentType(payload.typeCode)
}

const onVehicleTypeSelect = (payload: { typeCode: string }): void => {
  store.selectVehicleType(payload.typeCode as VehicleTypeCode)
}

onMounted(() => {
  store.start()
})

onBeforeUnmount(() => {
  if (tipTimer) clearTimeout(tipTimer)
  store.dispose()
})
</script>

<template>
  <ScreenLayout>
    <template #title>
      <div class="brand">
        <h1 class="brand__title">城市交通监控可视化大屏</h1>
        <div class="brand__sub">
          <span class="brand__region">{{ regionLabel }}</span>
          <span class="brand__divider"></span>
          <span>TRAFFIC MONITORING SYSTEM</span>
        </div>
      </div>
    </template>

    <template #filters>
      <FilterTagBar :tags="store.filterTags" @remove="onRemoveTag" />
    </template>

    <template #right>
      <TimeClock />
      <ControlBar
        :paused="store.paused"
        :fullscreen="store.fullscreen"
        :interval-ms="store.intervalMs"
        :accel="store.accel"
        @toggle-pause="store.togglePause()"
        @toggle-fullscreen="store.toggleFullscreen()"
      />
      <button class="about-link" title="系统说明（答辩展示）" @click="router.push('/about')">ⓘ 说明</button>
    </template>

    <template #left>
      <div class="kpi-grid">
        <KpiCard
          v-if="store.filteredKpi"
          title="拥堵指数"
          :value="store.filteredKpi.congestionIndex"
          unit="/10"
          :decimals="1"
          level-band
        />
        <KpiCard
          v-if="store.filteredKpi"
          title="在途车辆"
          :value="store.filteredKpi.activeVehicles"
          unit="辆"
        />
        <KpiCard
          v-if="store.filteredKpi"
          title="今日事故"
          :value="store.filteredKpi.accidentCountToday"
          unit="起"
        />
        <KpiCard
          v-if="store.filteredKpi"
          title="平均车速"
          :value="store.filteredKpi.avgSpeed"
          unit="km/h"
          :decimals="1"
        />
      </div>
      <IntersectionRankChart :items="store.filteredIntersections" />
    </template>

    <template #center>
      <MapChart
        :map-name="mapName"
        :heat-data="store.mapHeatData"
        :scatter-data="store.mapScatterData"
        :level="mapLevel"
        :subtitle="regionLabel + ' · 点击区域下钻'"
        @region-click="payload => store.drillDown(payload.code)"
        @back="store.backLevel()"
      />
    </template>

    <template #right-col>
      <AccidentPieChart
        :items="store.filteredAccidentTypeStat"
        :selected-type="store.selectedAccidentType"
        @type-select="onAccidentTypeSelect"
      />
      <VehicleRingChart
        :items="store.filteredVehicleTypeStat"
        :selected-type="store.selectedVehicleType"
        :total="totalVehicles"
        @type-select="onVehicleTypeSelect"
      />
    </template>

    <template #bottom>
      <HourFlowHeatChart :hours="store.filteredHourFlow" :current-hour="store.currentHour" />
      <CongestionTrendChart :points="store.filteredCongestionTrend" />
    </template>

    <transition name="tip-fade">
      <div v-if="store.mapMissingTip" class="geo-missing-tip">
        <span class="geo-missing-tip__icon">⚠</span>
        {{ store.mapMissingTip }}
      </div>
    </transition>
  </ScreenLayout>
</template>

<style scoped>
.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
  user-select: none;
}

.brand__title {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 6px;
  background: var(--grad-neon);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 14px rgba(0, 240, 255, 0.35));
  white-space: nowrap;
}

.brand__sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 3px;
  color: var(--text-muted);
}

.brand__region {
  color: var(--neon-cyan);
  letter-spacing: 2px;
}

.brand__divider {
  width: 28px;
  height: 1px;
  background: var(--grad-line);
}

.about-link {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--neon-purple);
  background: rgba(138, 43, 226, 0.1);
  border: 1px solid rgba(138, 43, 226, 0.5);
  border-radius: var(--radius-tag);
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.about-link:hover {
  background: rgba(138, 43, 226, 0.24);
  box-shadow: 0 0 12px rgba(138, 43, 226, 0.45);
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  min-height: 0;
}

.geo-missing-tip {
  position: absolute;
  left: 50%;
  top: 96px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 22px;
  border-radius: var(--radius-card);
  background: rgba(5, 8, 22, 0.92);
  border: 1px solid rgba(255, 184, 0, 0.6);
  box-shadow: 0 0 18px rgba(255, 184, 0, 0.3);
  color: var(--text-primary);
  font-size: 14px;
  letter-spacing: 1px;
  z-index: 30;
  white-space: nowrap;
}

.geo-missing-tip__icon {
  color: var(--neon-amber);
  font-size: 16px;
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.tip-fade-enter-from,
.tip-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>