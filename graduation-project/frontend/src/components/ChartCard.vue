<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section class="neon-card chart-card">
    <span class="neon-card__corner neon-card__corner--tl"></span>
    <span class="neon-card__corner neon-card__corner--tr"></span>
    <span class="neon-card__corner neon-card__corner--bl"></span>
    <span class="neon-card__corner neon-card__corner--br"></span>
    <header class="neon-card__header">
      <span class="neon-card__bar"></span>
      <span class="neon-card__title">{{ title }}</span>
      <span v-if="subtitle" class="neon-card__subtitle">{{ subtitle }}</span>
      <div class="chart-card__extra">
        <slot name="extra"></slot>
      </div>
    </header>
    <div class="neon-card__body">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.chart-card {
  height: 100%;
  min-height: 0;
}

.chart-card__extra {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>