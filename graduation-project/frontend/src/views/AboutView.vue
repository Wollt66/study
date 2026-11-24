<script setup lang="ts">
import router from '@/router'

const gotoScreen = (): void => {
  router.push('/')
}
</script>

<template>
  <div class="about">
    <header class="about__header">
      <h1 class="about__title">城市交通监控可视化大屏 · 系统说明</h1>
      <button class="about__back" @click="gotoScreen">‹ 返回监控大屏</button>
    </header>

    <main class="about__body">
      <section class="about-card">
        <h2>项目概述</h2>
        <p>
          本系统为<b>纯前端</b>城市交通监控可视化大屏（毕业设计作品），在无任何后端服务的条件下，
          通过内置模拟数据引擎驱动，实现离线可运行的交通态势监控演示。系统覆盖
          <b>34 个省级区域、66 个重点城市</b>，模拟在途车辆、路口流量、事故分布与拥堵指数的实时演化。
        </p>
        <div class="about-tags">
          <span class="tag">Vue 3 组合式 API</span>
          <span class="tag">TypeScript 严格模式</span>
          <span class="tag">Vite 6</span>
          <span class="tag">Pinia（SSOT）</span>
          <span class="tag">ECharts 5 按需引入</span>
          <span class="tag">Vue Router 4（hash）</span>
        </div>
      </section>

      <section class="about-card">
        <h2>三大技术亮点</h2>
        <div class="highlights">
          <div class="highlight">
            <h3>① 地图三级钻取</h3>
            <p>
              全国 → 省 → 市逐级下钻。geoJSON 资源本地打包并按需异步加载（懒加载 chunk），
              <b>断网环境完整可用</b>；地图名称与业务数据以 adcode 主键对齐，杜绝"数据有值但地图不上色"。
              内置广东 / 江苏 / 浙江 / 四川四省及广州 / 南京 / 杭州 / 成都四市边界，未收录区域给出友好降级提示。
            </p>
          </div>
          <div class="highlight">
            <h3>② 多图表联动（SSOT）</h3>
            <p>
              地区（钻取栈）、车辆类型、事故类型三个全局过滤维度全部收敛于 Pinia 单一 Store，
              12 个视图组件均为无业务状态的"渲染器"。点击地图区域 / 玫瑰图扇区 / 环形图图例，
              KPI 指标卡、TOP10 排行、趋势曲线、24h 热力、地图散点同步过滤刷新，
              过滤条件以标签条集中呈现、一键解除。
            </p>
          </div>
          <div class="highlight">
            <h3>③ 实时刷新与数据连续性</h3>
            <p>
              模拟引擎以 5s 周期推送快照（模拟时钟 60 倍加速：24 分钟滚完 24h 趋势窗口）。
              数据演化采用<b>双正弦 + 有界随机游走 + 双重钳制</b>噪声模型，
              相邻快照变化数学上不超过 ±15%，图表平滑过渡动画 ≤ 400ms；
              暂停即冻结模拟时钟，恢复后数据天然连续（相位无缝衔接）。
            </p>
          </div>
        </div>
      </section>

      <section class="about-card">
        <h2>架构分层</h2>
        <pre class="arch">
 L5 视图层   ScreenView → ScreenLayout + 12 个视图组件（无业务状态）
 L4 组合函数  useECharts（实例生命周期托管）/ useScreenAdapter（等比缩放）
 L3 状态层   Pinia screenStore —— 唯一数据源（快照 + 过滤 + 钻取栈）
 L2 数据引擎  MockEngine：模拟时钟 / 实体演化 / 自下而上聚合 / 事故泊松过程
 L1 资源层   geoJSON（异步 chunk）· ECharts 按需注册 · 霓虹设计令牌</pre
        >
        <p class="about__note">
          数据自底向上流动：引擎 tick → store 快照 → getters 派生 → 图表 watch 渲染；交互自顶向下流动：组件事件 → store action → 维度变更 → getters 重算。
        </p>
      </section>

      <section class="about-card">
        <h2>关键设计决策（ADR 节选）</h2>
        <ul class="adr">
          <li><b>transform: scale 等比缩放</b> —— DOM 与 canvas 一视同仁，非 16:9 窗口零裁切（1366×768 ~ 2560×1440 自适应）。</li>
          <li><b>hash 路由</b> —— 静态托管 / 离线分发零服务器配置。</li>
          <li><b>geoJSON 仅内置全国 + 4 省 + 4 市</b> —— 体积约 1.5MB（对比全量 30MB+），未收录区域走降级提示。</li>
          <li><b>ECharts 实例切层复用</b> —— setOption 原地换装地图，防闪烁、防内存泄漏，支撑 2 小时长时运行。</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.about {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 28px 6vw 60px;
}

.about__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.about__title {
  font-family: var(--font-display);
  font-size: 26px;
  letter-spacing: 4px;
  background: var(--grad-neon);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.about__back {
  font-size: 14px;
  color: var(--neon-cyan);
  background: rgba(0, 240, 255, 0.08);
  border: 1px solid rgba(0, 240, 255, 0.45);
  border-radius: var(--radius-tag);
  padding: 6px 18px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.about__back:hover {
  background: rgba(0, 240, 255, 0.2);
  box-shadow: 0 0 14px rgba(0, 240, 255, 0.4);
}

.about-card {
  border-radius: var(--radius-card);
  background: var(--bg-panel);
  border: 1px solid var(--border-neon);
  box-shadow: var(--glow-cyan);
  padding: 22px 28px;
  margin-bottom: 18px;
}

.about-card h2 {
  font-family: var(--font-display);
  font-size: 17px;
  letter-spacing: 3px;
  color: var(--neon-cyan);
  margin-bottom: 14px;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
}

.about-card p {
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-secondary);
}

.about-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.tag {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--neon-green);
  border: 1px solid rgba(0, 255, 163, 0.4);
  border-radius: var(--radius-tag);
  padding: 3px 12px;
  background: rgba(0, 255, 163, 0.06);
}

.highlights {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.highlight {
  border-radius: var(--radius-inner);
  border: 1px solid rgba(138, 43, 226, 0.35);
  background: rgba(138, 43, 226, 0.06);
  padding: 16px 18px;
}

.highlight h3 {
  font-size: 15px;
  color: var(--neon-magenta);
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.highlight p {
  font-size: 13px;
}

.arch {
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: var(--radius-inner);
  padding: 16px 20px;
  overflow-x: auto;
}

.about__note {
  margin-top: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.adr {
  list-style: none;
  display: grid;
  gap: 10px;
}

.adr li {
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--text-secondary);
  padding-left: 18px;
  position: relative;
}

.adr li::before {
  content: '◈';
  position: absolute;
  left: 0;
  color: var(--neon-cyan);
}
</style>