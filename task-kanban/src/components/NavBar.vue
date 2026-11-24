<script setup>
import ThemeSelector from './ThemeSelector.vue'

defineProps({
  totalCount: { type: Number, default: 0 },
  starredCount: { type: Number, default: 0 },
  urgentCount: { type: Number, default: 0 },
  doneCount: { type: Number, default: 0 }
})
const emit = defineEmits(['add-task', 'reset'])
</script>

<template>
  <header class="navbar">
    <div class="brand">
      <span class="logo">📋</span>
      <div class="brand-text">
        <h1>任务看板</h1>
        <p>高效管理你的每一件事</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat-item">
        <span class="stat-num">{{ totalCount }}</span>
        <span class="stat-label">全部</span>
      </div>
      <div class="stat-item star">
        <span class="stat-num">{{ starredCount }}</span>
        <span class="stat-label">⭐</span>
      </div>
      <div class="stat-item urgent">
        <span class="stat-num">{{ urgentCount }}</span>
        <span class="stat-label">🔴</span>
      </div>
      <div class="stat-item done">
        <span class="stat-num">{{ doneCount }}</span>
        <span class="stat-label">✅</span>
      </div>
    </div>

    <div class="actions">
      <button class="btn primary" @click="emit('add-task')">
        <span>➕</span>
        <span>新增任务</span>
      </button>
      <button class="btn ghost" @click="emit('reset')" title="重置看板">
        <span>🔄</span>
        <span>重置</span>
      </button>
      <ThemeSelector />
    </div>
  </header>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: var(--space-4) var(--space-6);
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.logo {
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}
.brand-text h1 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}
.brand-text p {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.stats {
  display: flex;
  gap: var(--space-4);
  margin-left: auto;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
}
.stat-num {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text);
}
.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
.stat-item.star .stat-num { color: var(--color-star); }
.stat-item.urgent .stat-num { color: var(--color-urgent); }
.stat-item.done .stat-num { color: var(--color-success); }

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  transition: all var(--transition-fast);
}
.btn.primary {
  background: var(--color-primary);
  color: #fff;
  box-shadow: var(--shadow-sm);
}
.btn.primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.btn.ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.btn.ghost:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

@media (max-width: 640px) {
  .navbar {
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .stats {
    margin-left: 0;
    order: 3;
    width: 100%;
    justify-content: space-around;
  }
  .brand-text p { display: none; }
  .btn span:last-child { display: none; }
}
</style>