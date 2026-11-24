<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useScreenAdapter } from '@/composables/useScreenAdapter'
import { useScreenStore } from '@/stores/screen'

const props = withDefaults(
  defineProps<{
    designW?: number
    designH?: number
  }>(),
  { designW: 1920, designH: 1080 }
)

const { containerStyle } = useScreenAdapter(props.designW, props.designH)
const store = useScreenStore()

const onFullscreenChange = (): void => {
  store.setFullscreen(Boolean(document.fullscreenElement))
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div class="screen-adapter" :style="containerStyle">
    <div class="screen-layout">
      <header class="screen-layout__header">
        <div class="screen-layout__title">
          <slot name="title"></slot>
        </div>
        <div class="screen-layout__filters">
          <slot name="filters"></slot>
        </div>
        <div class="screen-layout__right">
          <slot name="right"></slot>
        </div>
      </header>
      <main class="screen-layout__main">
        <div class="screen-layout__left">
          <slot name="left"></slot>
        </div>
        <div class="screen-layout__center">
          <slot name="center"></slot>
        </div>
        <div class="screen-layout__right-col">
          <slot name="right-col"></slot>
        </div>
      </main>
      <footer class="screen-layout__bottom">
        <slot name="bottom"></slot>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.screen-layout {
  width: v-bind('props.designW + "px"');
  height: v-bind('props.designH + "px"');
  display: grid;
  grid-template-areas:
    'header header header'
    'left center right'
    'bottom bottom bottom';
  grid-template-columns: 420px 1fr 420px;
  grid-template-rows: 84px 600px 360px;
  gap: 12px;
  padding: 12px;
}

.screen-layout__header {
  grid-area: header;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 8px;
  min-width: 0;
}

.screen-layout__title {
  flex: none;
  min-width: 0;
}

.screen-layout__filters {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.screen-layout__right {
  flex: none;
  display: flex;
  align-items: center;
  gap: 14px;
}

.screen-layout__main {
  grid-area: main;
  display: contents;
}

.screen-layout__left {
  grid-area: left;
  display: grid;
  grid-template-rows: 240px 1fr;
  gap: 12px;
  min-height: 0;
}

.screen-layout__center {
  grid-area: center;
  min-height: 0;
}

.screen-layout__right-col {
  grid-area: right;
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  min-height: 0;
}

.screen-layout__bottom {
  grid-area: bottom;
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 12px;
  min-height: 0;
}
</style>