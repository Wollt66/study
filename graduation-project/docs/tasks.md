# 城市交通监控可视化大屏 实施任务清单

| 项目属性 | 内容 |
| --- | --- |
| 项目名称 | 城市交通监控可视化大屏（本科毕业设计） |
| 文档类型 | 实施任务清单（tasks.md） |
| 文档版本 | v1.0 |
| 编写日期 | 2026-10-31 |
| 上游文档 | `requirements/需求规格说明书.md`（v1.0）、`design/系统设计文档.md`（v1.0） |
| 技术栈 | Vue 3（组合式 API + TypeScript）+ Vite + Pinia + vue-router 4 + ECharts 5（按需引入） |
| 任务规模 | 8 个批次（Batch）／38 个任务（T-01 ~ T-38） |

---

## 一、施工总览

### 1.1 批次依赖图

```
B1 脚手架 ──┬──▶ B2 Mock 引擎 ──▶ B3 Pinia Store ──┬──▶ B5 地图钻取 ──▶ B6 专题图表 ──▶ B7 联动收尾 ──▶ B8 构建验证
            └──▶ B4 通用基础设施 ──────────────────┘
```

依赖说明：

- B1 是全部后续批次的前提；
- B2/B3 与 B4 理论上可并行（B4 仅依赖 B1）；单人开发按 B1→B2→B3→B4 串行推进风险最低；
- B5 依赖 B3（getters 数据）+ B4（ChartCard / useECharts / 主题 / R5 spike 结论）；
- B6 依赖 B3 + B4；B5 与 B6 内部任务可交叉并行；
- B7 为全屏联动接线收尾，依赖 B5、B6 全部完成；
- B8 为验收关口，依赖全部批次。

### 1.2 批次一览

| 批次 | 主题 | 任务区间 | 任务数 | 交付里程碑 |
| --- | --- | --- | --- | --- |
| B1 | 项目脚手架与工程基础 | T-01 ~ T-04 | 4 | M1 工程骨架就绪 |
| B2 | Mock 数据引擎 | T-05 ~ T-10 | 6 | — |
| B3 | Pinia 联动状态层 | T-11 ~ T-13 | 3 | M2 数据心跳可见 |
| B4 | 通用基础设施 | T-14 ~ T-19 | 6 | — |
| B5 | 地图资源与三级钻取 | T-20 ~ T-23 | 4 | M3 大屏首屏可见 |
| B6 | KPI 与专题图表组件 | T-24 ~ T-29 | 6 | — |
| B7 | 联动收尾与控制组件 | T-30 ~ T-34 | 5 | M4 三大亮点全通 |
| B8 | 构建验证与总体自测 | T-35 ~ T-38 | 4 | M5 验收就绪 |

复杂度标记：S（≤0.5 天）／M（0.5 ~ 1.5 天）／L（> 1.5 天）。

---

## 二、任务明细

### Batch 1：项目脚手架与工程基础（T-01 ~ T-04）

**目标**：建立可构建、可运行、带霓虹样式基座与体积预算的空工程。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-01 | 初始化 Vite + Vue3 + TS 脚手架 | 按 design.md §三目录结构创建工程骨架；tsconfig 开严格模式；入口 HTML 深色底防白闪；App.vue 仅承载 router-view | `package.json`、`vite.config.ts`、`tsconfig.json`、`index.html`、`src/main.ts`、`src/App.vue` | `npm run dev` 启动无报错；`npm run build` 通过 | S | NFR-10、ADR-9 |
| T-02 | 安装核心依赖与 hash 路由 | 安装 pinia / vue-router@4 / echarts；路由采用 hash 模式；路由表两条（`/` 同步加载、`/about` 懒加载） | `package.json`、`src/router/index.ts`、`src/main.ts` | `npm run dev` 后 `/` 与 `/about` 可互跳；刷新不 404 | S | NFR-07、ADR-2 |
| T-03 | Vite 构建分包与体积预算 | echarts 拆独立 vendor chunk；JSON 超内联阈值自动外置为异步 chunk；主 bundle 预算 ≤ 900KB（gzip 前） | `vite.config.ts` | `npm run build` 后检查 dist 主 chunk 体积 ≤ 900KB | M | NFR-01、R2/R3 |
| T-04 | 霓虹设计令牌与全局样式基座 | design tokens（霓虹色板 / 圆角 / 辉光 CSS 变量）；深色底 `#050816` reset；neon-card 通用类（圆角 ≥ 12px） | `src/styles/variables.css`、`src/styles/base.css`、`src/styles/neon-card.css` | dev 目视 body 深色无白闪；neon-card 类应用于测试元素出现圆角 + 辉光 | S | NFR-08/09 |

### Batch 2：Mock 数据引擎（T-05 ~ T-10）

**目标**：交付纯 TS、无框架依赖、可独立验证的离线数据引擎（L2 层，依赖 B1）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-05 | 全局领域类型定义 | 定义实体类型（E1~E8：Province / City / Intersection / AccidentRecord / FlowSeries / VehicleTypeStat / KpiSnapshot / TrendPoint）；Snapshot、FilterTag、RegionLevel、各图表 Props 契约 | `src/types/index.ts` | `npx vue-tsc --noEmit` 通过 | M | NFR-10、需求 §5.2 |
| T-06 | 常量字典与权重表 | 车辆 / 事故类型枚举字典；34 省权重表与 cityShare 归一；geo 内置清单（4 省 + 4 市 adcode）；拥堵五级色带常量（区间 + 等级文案 + 色值，单一来源） | `src/mock/constants.ts` | 五级色带常量唯一（后续主题 / KPI / visualMap 共用）；省内 cityShare 合计 = 1 | M | FR-16/17、设计 §9.3 |
| T-07 | 平滑噪声与双峰函数 | 有界随机游走 w(t)（W_max=8%×base）；双正弦波（T₁=300s / T₂=40s）；输出先连续性钳制 ±15% 再业务值域钳制；hourFactor 早晚双峰 + 车辆类型差异化形状（公交尖峰 / 货车日间平台 / 电动车晚峰×1.2） | `src/mock/noise.ts` | 抽样断言相邻两次输出变化 ≤ ±15%；hourFactor 满足深夜低谷、双峰、晚峰略高 | M | FR-10、需求 §5.3 约束 1/2/4、设计 §8.3/8.4 |
| T-08 | 实体工厂 | 省市 / 路口 / 事故 / 车辆类型实体工厂；层级基准链（全国基准 × 省权重 × 市占省比）；非内置省份按省权重直生成省级实体；活跃事故封顶 200 条；事故实体扩展 vehicleType 涉事类型字段 | `src/mock/entities.ts` | 生成 34 省实体、4 内置省约 66 市、路口 / 事故数量级正确；字段完整性校验通过 | M | 需求 §5.2 E1~E8、设计 §8.1/8.2 |
| T-09 | 自下而上聚合与口径断言 | 市→省→全国聚合（在途 / 事故求和、车速按在途加权、拥堵均值 + 微噪）；开发期断言 Σ vehicleType.activeCount == activeVehicles、Σ ratio == 100% | `src/mock/aggregate.ts` | 断言全程无报错；聚合值与手工抽算一致 | M | 需求 §5.3 约束 4/5/6、设计 §8.7 |
| T-10 | MockEngine 调度与模拟时钟 | 全局单例引擎；config 集中管理（intervalMs=5000、accel=60、随机种子可选）；bootstrap 构建实体并按 hourFactor 回放过去 24h 趋势（288 点/地区）；tick 推进 simTime → 演化 → 聚合 → 产出 Snapshot 回调；pause 冻结 simTime / resume 无缝衔接；dispose 清 interval | `src/mock/engine.ts` | 控制台驱动：5s 一拍快照滚动；暂停后 simTime 冻结、恢复后首批值与冻结前连续（±15% 内） | L | FR-10/11、NFR-11/12、ADR-5/7 |

### Batch 3：Pinia 联动状态层（T-11 ~ T-13）

**目标**：建立 SSOT 唯一数据源，打通"引擎 tick → Store → getters"数据心跳（依赖 B2）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-11 | Store 核心状态与钻取栈 | regionStack 钻取栈（CHINA 起步）；selectedVehicleType / selectedAccidentType 双维度；paused、snapshot、mapMissingTip 状态定义 | `src/stores/screen.ts` | Vue devtools 观察 push / pop 正确；栈顶即 currentRegion | M | FR-01~04、设计 §7.3 |
| T-12 | 联动过滤 getters（§7.4 矩阵全量） | filteredKpi / filteredIntersections / filteredAccidentTypeStat / filteredVehicleTypeStat / filteredCongestionTrend / filteredHourFlow / 地图 heatData 与 scatterData；逐格实现矩阵口径（拥堵指数不随类型缩放等显式约定） | `src/stores/screen.ts` | devtools 手工置各类过滤态，getters 输出与 §7.4 矩阵逐项一致 | L | FR-06/07/08、设计 §7.4 |
| T-13 | 引擎接线与 actions | 视图挂载时 engine.start 并注入 applyTick 回调；实现 drillDown / backLevel / selectVehicleType / selectAccidentType / togglePause；路由离开时 stop + dispose | `src/stores/screen.ts`、`src/views/ScreenView.vue`（临时挂载点） | 暂停时 getters 冻结、恢复后连续；钻取栈变化驱动 getters 切换 | M | FR-03/04/10/11、设计 §4.3 |

### Batch 4：通用基础设施（T-14 ~ T-19）

**目标**：交付 useECharts / useScreenAdapter / 霓虹主题 / ChartCard 四件套，并完成 R5 技术风险前置验证（依赖 B1，可与 B2/B3 并行）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-14 | ECharts 按需注册入口 | `use([...])` 统一注册（6 类图表 + 5 类组件 + CanvasRenderer）；禁止全量 `import * as echarts` | `src/chart/setup.ts` | `npm run build` 后 echarts vendor chunk 体积较全量引入削减 ≥ 40% | S | NFR-01、设计 §9.4、R3 |
| T-15 | 霓虹主题定义与注册 | registerTheme('neon') 一次全局生效；7 色调色盘；字体栈（Orbitron / Rajdhani / Share Tech Mono + 兜底）；折线辉光 / 柱渐变 / 饼选中外扩 / 深色玻璃 tooltip；色带引用 §9.3 常量 | `src/chart/theme.ts` | 测试页渲染样例折线 / 柱 / 饼，目视辉光与配色符合 §9.2 规格 | M | NFR-08、设计 §9.2/9.3 |
| T-16 | useECharts 生命周期托管 | init(theme) + 首刷；ResizeObserver 防抖 150ms 触发 resize；watchDeps 变化 → setOption(merge) 只更新数据；动画统一 ≤ 400ms；卸载时 dispose + disconnect + 清定时器原子完成 | `src/composables/useECharts.ts` | 挂载-更新-resize-卸载全链路无报错；卸载后实例 isDisposed 为真 | M | NFR-02/04/12、设计 §6.1、R7 |
| T-17 | useScreenAdapter 等比缩放 | min-scale contain 算法 + 双向居中偏移；resize 防抖 100ms 与 fullscreenchange 双触发重算；letterbox 留白区深空背景填充 | `src/composables/useScreenAdapter.ts` | devtools 设备模拟 1366×768 与 2560×1440 下均无裁切 / 滚动条 / 错位 | M | FR-20、NFR-06、设计 §6.2、ADR-1 |
| T-18 | ChartCard 通用卡片容器 | 霓虹圆角边框（radius 14px）+ 深色半透玻璃底 + 双层辉光；标题栏左侧霓虹渐变竖条；`extra` 具名插槽供卡片头右侧操作 | `src/components/ChartCard.vue` | 目视样式符合 §5.3 规格；插槽内容正常渲染 | S | NFR-08/10 |
| T-19 | R5 spike：缩放容器下 ECharts 坐标验证 | transform:scale 容器内渲染带点击事件的测试图表；在 0.711× 与 1.333× 两档缩放下验证点击命中与 tooltip 定位 | `src/components/ScreenLayout.vue`（临时验证内容） | 两档缩放下点击与 tooltip 均定位准确 → 锁定方案后移除验证代码 | S | 设计 §6.2 / 风险 R5 前置验证 |

### Batch 5：地图资源与三级钻取（T-20 ~ T-23）

**目标**：geoJSON 资源入库 + 地图注册表 + 钻取地图组件 + 大屏版式骨架，达成"全国地图首屏可见"里程碑（依赖 B3 + B4）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-20 | geoJSON 下载脚本与资源入库 | 编写 Node ESM 脚本 `scripts/fetch-geo.mjs`（kebab-case CLI 参数、附 `--help` 与失败重试说明），从阿里 DataV areas_v3（`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`）下载 9 份边界：全国 100000、省级 440000/320000/330000/510000、市级 440100/320100/330100/510100；下载后裁剪 properties 至 name / adcode / center / centroid；README 补充离线手工获取说明 | `scripts/fetch-geo.mjs`、`src/assets/geo/`（china / guangdong / jiangsu / zhejiang / sichuan / guangzhou / nanjing / hangzhou / chengdu 共 9 个 .json） | `node scripts/fetch-geo.mjs` 一次成功产出 9 文件；总体积约 5MB（±20%）；devtools Offline 模式下地图资源仍可加载 | M | NFR-07、ADR-3、设计 §10.2、R2 |
| T-21 | MapRegistry 懒加载注册表 | `import.meta.glob` 生成 geo 懒加载映射；load(code) 返回 Promise 且 registerMap 后写缓存判重；未收录 code 返回缺失标记；维护 adcode → geoName 名称映射表 | `src/services/mapRegistry.ts` | 同名两次 load 仅 registerMap 一次（日志验证）；未收录 code 走缺失分支 | M | FR-02/03、设计 §10.1、R1 |
| T-22 | MapChart 钻取地图组件 | geo 底图 + choropleth 热力（五级 visualMap 同源色带）+ effectScatter 事故散点（severity 映射点径三档色，≤ 50 点限流）；区域 click 命中后按 drillableCodes 判定 emit region-click / geo-missing；`extra` 插槽"返回上一级"按钮 emit back（country 级隐藏）；tooltip formatter 输出区域名 / 拥堵指数（带等级色点）/ 在途车辆 / 今日事故；切层 setOption 原地换装不重建实例 | `src/components/charts/MapChart.vue` | 全国→省→市钻取与逐级返回流畅无闪烁；悬浮 tooltip 四项信息正确；点击非内置市出全局提示且视图不变 | L | FR-01~05、设计 §5.3、ADR-8 |
| T-23 | ScreenLayout 版式与 ScreenView 编排 | CSS Grid 五区版式（header 84 / 左 400 / 中 1040 / 右 400 / 底部通栏 360，gap 12px）；内层固定 1920×1080 + transform 缩放；ScreenView 编排组件占位、统一转发事件到 Store | `src/components/ScreenLayout.vue`、`src/views/ScreenView.vue` | dev 目视版式分区与 §5.1 设计稿一致；1920×1080 下无滚动条 | M | FR-01/20、NFR-09、设计 §5.1 |

### Batch 6：KPI 与专题图表组件（T-24 ~ T-29）

**目标**：交付 4 张 KPI 卡与 5 个专题图表组件，全部消费 Store getters、包裹 ChartCard（依赖 B3 + B4，可与 B5 后半程并行）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-24 | KpiCard 指标卡（×4 实例） | props 含 title / value / unit / level / sparkline；拥堵指数卡附五级色标条（与 visualMap 同源常量）；数值更新走 CSS transition 平滑滚动；四卡 2×2 网格 | `src/components/KpiCard.vue` | 四项 KPI 数值随刷新平滑变化且不破版式；等级色标与地图色带一致 | M | FR-13/14、设计 §5.3 |
| T-25 | IntersectionRankChart TOP10 排行 | 横向霓虹渐变条排行；TOP10 按流量降序；刷新时更新排序与数值（排序动画）；柱项点击降级为本地高亮 + 详情强化（ADR-6 约定） | `src/components/charts/IntersectionRankChart.vue` | 人工核对首名流量 > 末名；刷新后排序与数值更新 | M | FR-15、ADR-6 |
| T-26 | AccidentPieChart 事故类型分布 | 玫瑰 / 饼图呈现五类事故数量与占比；扇区选中外扩 + 描边高亮、未选中降透明 0.35；点击 emit type-select（再点同项 = 取消）；selectedType 由 Store 回流同步高亮 | `src/components/charts/AccidentPieChart.vue` | 各类型占比合计 100%；点击"追尾"扇区触发全局联动、再点恢复 | M | FR-16/07、设计 §5.3 |
| T-27 | VehicleRingChart 车辆类型占比 | 环形图呈现四类车辆在途占比；图例项可选中（同 type-select 双态语义）；中心显示在途总数；selectedType 回流同步 | `src/components/charts/VehicleRingChart.vue` | 占比合计 100%；选"货车"后其余图表按类型过滤 | M | FR-17/08 |
| T-28 | CongestionTrendChart 拥堵趋势 | 288 点滚动窗口平滑曲线；刷新追加尾部数据点并窗口 shift；渐变面积 + 辉光样式 | `src/components/charts/CongestionTrendChart.vue` | 曲线连续平滑无台阶；运行 1 分钟可见窗口滚动追加 | M | FR-19 |
| T-29 | HourFlowHeatChart 分时流量热力 | 单行 24 格 heatmap；横向 visualMap 青→品红渐变；x 轴 0—23 时全覆盖；currentHour 对应格霓虹描边并随模拟时钟推进 | `src/components/charts/HourFlowHeatChart.vue` | 早晚高峰（7—9 / 17—19 时）呈现明显深色带；当前时段描边随刷新推进 | M | FR-18、设计 §8.4 |

### Batch 7：联动收尾与控制组件（T-30 ~ T-34）

**目标**：补齐控制 / 标签 / 时钟组件，完成全屏联动接线，三大技术亮点全部可演示（依赖 B5 + B6）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-30 | ControlBar 控制条 | 暂停 / 恢复按钮（含"已暂停"状态标示）；全屏切换按钮；当前刷新周期显示；emit toggle-pause / toggle-fullscreen；ScreenLayout 侧挂载 Fullscreen API + fullscreenchange 重算缩放 | `src/components/ControlBar.vue`、`src/components/ScreenLayout.vue` | 暂停后数据冻结 + 标示"已暂停"，恢复后连续；全屏进入 / ESC 退出后布局与缩放正常 | M | FR-11/21、R6 |
| T-31 | FilterTagBar 过滤标签条 | 集中标示三维度生效过滤条件（地区 / 车辆类型 / 事故类型）；标签点击解除（类型维度置 null，地区维度连续 backLevel 回全国）；全部解除后恢复默认（全国 / 全量）标示 | `src/components/FilterTagBar.vue` | 设定组合过滤后标签逐一显示；逐个解除后图表同步恢复 | S | FR-09、设计 §7.3 |
| T-32 | TimeClock 实时时钟 | 顶部日期时间显示；独立 1s 定时器不受数据暂停影响；霓虹等宽数字风格 | `src/components/TimeClock.vue` | 暂停数据刷新时时钟仍正常走时 | S | 辅助功能（设计 §三） |
| T-33 | 联动全链路集成接线 | ScreenView 统一接住 region-click / back / type-select / geo-missing 事件并转发 Store action；geo-missing → mapMissingTip 全局提示（含可下钻省份清单）；按 §7.4 矩阵人工核对地图→图表、图表→图表、标签解除三条链路 | `src/views/ScreenView.vue`、`src/stores/screen.ts` | AC-02/03/05/06/07 五个场景人工走查全部通过 | M | FR-06~09、R10 |
| T-34 | AboutView 答辩说明页 | 项目概述 / 技术栈 / 三大亮点原理图解 / 五层架构图 / 设计取舍说明（geo 裁剪范围 + 可下钻清单）；纯静态无 Store 订阅、无定时器 | `src/views/AboutView.vue` | `/about` 懒加载路由打开正常；与大屏共享霓虹样式基座 | S | 答辩辅助、设计 §4.2 |

### Batch 8：构建验证与总体自测（T-35 ~ T-38）

**目标**：性能 / 稳定性 / 兼容性三线验证 + 自测清单执行，达成验收就绪（依赖全部批次）。

| ID | 任务名 | 执行要点 | 涉及文件 | 验收命令 / 标准 | 复杂度 | 需求映射 |
| --- | --- | --- | --- | --- | --- | --- |
| T-35 | 构建与首屏性能验证 | `npm run build` + `npm run preview`；复核主 bundle ≤ 900KB 与 geo chunk 分片；devtools Offline 断网全流程演示；Performance 面板记录首屏耗时 | `vite.config.ts`（按需微调） | `npm run build` 零报错；断网下全部功能可用；首屏完整呈现 < 3s | M | NFR-01/07、AC-01 |
| T-36 | 长时运行稳定性回归 | 连续运行 2 小时；期间反复执行地图钻取 / 返回、暂停 / 恢复切换、联动过滤组合操作；Performance / Memory 面板记录帧率与内存曲线 | 无新增（运行验证） | 帧率约 60fps 无卡顿加剧；内存占用无持续增长；无崩溃 | M | NFR-03/12、AC-20、R4/R8 |
| T-37 | 双浏览器与多分辨率兼容验证 | Chrome / Edge 最新版分别完整执行演示主流程；2560×1440 / 1920×1080 / 1366×768 三档分辨率检查；拖动窗口验证实时适配 | 无新增（运行验证） | 两浏览器功能与视觉一致；三档分辨率均无裁切 / 滚动条 / 错位 | M | NFR-05/06、AC-16/17/19 |
| T-38 | 总体自测清单执行 | 按第四章自测清单 AC-01 ~ AC-21 逐项打勾；P0 场景（AC-01~04、06、07、09、10、12~14、16~18、20）必须全部通过，P1 通过率 ≥ 80%；未过项记录原因并回归修复 | `docs/tasks.md`（勾选记录） | 全部 P0 验收场景勾选通过 | M | 需求 §6.3 通过判定 |

---

## 三、geoJSON 资源获取方案（T-20 专项说明）

- **来源**：阿里 DataV GeoAtlas（`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`），一次性联网下载后本地入库，运行期零外联（NFR-07）。
- **下载清单（9 份）**：

| 层级 | 地区 | adcode | 目标文件 |
| --- | --- | --- | --- |
| 全国 | 中国 | 100000 | `src/assets/geo/china.json` |
| 省级 | 广东 / 江苏 / 浙江 / 四川 | 440000 / 320000 / 330000 / 510000 | `guangdong / jiangsu / zhejiang / sichuan.json` |
| 市级 | 广州 / 南京 / 杭州 / 成都 | 440100 / 320100 / 330100 / 510100 | `guangzhou / nanjing / hangzhou / chengdu.json` |

- **脚本要求**：`scripts/fetch-geo.mjs`（Node ESM）；命令行参数 kebab-case（如 `--output`、`--province`）；每个命令附 `--help` 用法与示例；含超时重试与体积校验；下载后自动裁剪 properties 至 name / adcode / center / centroid（坐标不抽稀，保轮廓精度）。
- **降级约定**：未内置省份 / 城市下钻时按 FR-03 走"地图数据缺失"全局提示，并在 `/about` 页说明设计取舍（ADR-3 / R10）。
- **离线兜底**：README 记录手工下载步骤与 URL 清单，脚本失败时可人工放置同规格文件。

---

## 四、总体自测清单（对应 AC-01 ~ AC-21）

逐项人工打勾执行；P0 场景（加粗编号）必须全部通过。

### 4.1 功能性验收

| 编号 | 操作步骤 | 预期结果 | 关联需求 | 结果 |
| --- | --- | --- | --- | --- |
| **AC-01** | 断网状态下启动大屏 | 首屏 3 秒内完整呈现：全国地图热力 + 事故散点 + 四项 KPI + 全部图表，数据为全国维度 | FR-01/13、NFR-01/07 | ☐ |
| **AC-02** | 在全国地图点击某省（内置省份） | 地图切换为该省市级视图，热力与散点变为该省维度，全部图表联动刷新 | FR-02/06 | ☐ |
| **AC-03** | 在省级地图点击某市（内置城市） | 地图切换为该市视图，全部图表切换为该市维度 | FR-03/06 | ☐ |
| **AC-04** | 在市级视图连续两次点击"返回上一级" | 依次返回省级、全国视图，图表与 KPI 同步回退至对应层级 | FR-04 | ☐ |
| **AC-05** | 点击地图数据不可用的城市 | 出现明确提示，当前视图与数据保持不变 | FR-03 | ☐ |
| **AC-06** | 点击事故类型分布图的"追尾"扇区，再次点击取消 | 其他图表按"追尾"维度过滤刷新；取消后恢复 | FR-07 | ☐ |
| **AC-07** | 选择车辆类型"货车" | 流量、事故等图表按"货车"过滤，界面标示当前过滤条件 | FR-08/09 | ☐ |
| AC-08 | 鼠标悬浮地图任一区域后移出 | 显示区域名称与核心指标提示框，移出后消失 | FR-05 | ☐ |
| **AC-09** | 大屏静置运行 | 每 5 秒（默认周期）自动刷新全部图表与 KPI，数据连续无跳变 | FR-10 | ☐ |
| **AC-10** | 点击"暂停刷新"后再点击"恢复刷新" | 暂停后全部数据冻结且标示"已暂停"；恢复后数据从冻结数值连续滚动 | FR-11 | ☐ |
| AC-11 | 观察刷新与钻取过程 | 图表以平滑动画过渡，无布局抖动与错位 | FR-12、NFR-02 | ☐ |
| **AC-12** | 查看路口流量排行 | 展示 TOP10 路口名称与流量值，降序排列，随刷新更新排序 | FR-15 | ☐ |
| **AC-13** | 查看事故类型与车辆类型占比图 | 各类型占比合计 100%，随刷新更新 | FR-16/17 | ☐ |
| **AC-14** | 查看 24 小时分时流量热力图 | 横轴覆盖 0—23 时，早晚高峰时段呈现明显深色带 | FR-18 | ☐ |
| AC-15 | 查看拥堵指数趋势图 | 曲线连续平滑，随刷新追加最新数据点 | FR-19 | ☐ |

### 4.2 非功能性验收

| 编号 | 操作步骤 | 预期结果 | 关联需求 | 结果 |
| --- | --- | --- | --- | --- |
| **AC-16** | 在 2560×1440 与 1366×768 下分别打开大屏 | 等比缩放完整呈现，无裁切、遮挡、错位与滚动条 | NFR-06、FR-20 | ☐ |
| **AC-17** | 演示过程中拖动改变浏览器窗口大小 | 大屏实时重新适配，布局保持正常 | FR-20 | ☐ |
| **AC-18** | 点击"全屏"进入、按 ESC 退出 | 进入 / 退出全屏后布局与缩放均正常 | FR-21 | ☐ |
| AC-19 | 使用 Chrome 与 Edge 最新版分别完整执行演示流程 | 功能与视觉表现一致 | NFR-05 | ☐ |
| **AC-20** | 持续运行 2 小时（含反复钻取、联动与暂停/恢复） | 帧率与内存稳定，无卡顿加剧、无崩溃 | NFR-03/12 | ☐ |
| AC-21 | 目视检查整体视觉 | 深色底 + 霓虹青/品红/紫渐变高亮 + 辉光 + 圆角卡片，各数据系列色彩可辨 | NFR-08/09 | ☐ |

**通过判定**：加粗 P0 场景全部通过，且非加粗 P1 场景通过率 ≥ 80%（P2 不判定）。

---

## 五、论文素材映射

| 论文章节 | 素材来源（文档 / 任务 / 模块） | 可直接产出素材 |
| --- | --- | --- |
| 系统分析 | `requirements.md` 全文；T-05 | 需求用例图、EARS 需求表（FR/NFR 清单）、数据实体 E1~E8 数据字典、业务流程（三级钻取 / 联动 / 刷新） |
| 系统设计 | `design.md` §二/§五~§九；T-11~T-19 | 五层架构图、组件契约表（12 组件 props/emits）、SSOT 数据流图、联动过滤矩阵、平滑噪声与双峰函数公式、transform:scale 缩放算法、ADR-1~9 决策对比表 |
| 系统实现 | T-06~T-10（模拟引擎）；T-20~T-22（地图钻取）；T-24~T-29（图表组件）；T-30~T-31（控制与标签） | 分模块实现说明与关键截图：模拟数据引擎核心算法、geoJSON 懒加载与 registerMap 缓存、ECharts 霓虹主题与按需引入、联动 getters 实现、暂停冻结时钟机制 |
| 系统测试 | T-35~T-38 + 第四章自测清单 | AC-01~21 测试用例表（场景 / 步骤 / 预期 / 结果）、首屏性能数据、2 小时稳定性帧率与内存曲线、多分辨率 / 双浏览器对比截图 |
| 答辩演示脚本 | 需求 §2.2 场景 1~4 对应上述任务成果 | 按场景 1（主流程钻取）→ 场景 2（多维联动）→ 场景 3（数据冻结）→ 场景 4（多分辨率）的演示动线串讲稿 |

---

## 六、关键里程碑

| 里程碑 | 达成节点 | 判定标准 |
| --- | --- | --- |
| M1 工程骨架就绪 | B1 完 | `npm run build` 通过；霓虹样式基座与体积预算生效 |
| M2 数据心跳可见 | B3 完 | 控制台 / devtools 中 snapshot 每 5s 滚动，暂停冻结、恢复连续 |
| M3 大屏首屏可见 | B5 完 | 全国地图热力 + 散点在 1920×1080 版式中完整渲染，三级钻取可走通 |
| M4 三大亮点全通 | B7 完 | 地图钻取、全图表联动、实时刷新 / 暂停恢复全部可现场演示 |
| M5 验收就绪 | B8 完 | 自测清单全部 P0 场景勾选通过，2h 长跑与多分辨率验证无异常 |

---

*（完）本文档为实施任务清单；执行进度以勾选方式回写至各任务与第四章自测清单。*