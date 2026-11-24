# 城市交通监控可视化大屏

毕业设计作品 · 纯前端方向。基于 Vue 3 + ECharts 5 的城市交通态势可视化大屏，内置模拟数据引擎，**断网环境完整可运行**（答辩演示零依赖）。

## 功能特性

- **地图三级钻取**：全国 → 省 → 市（内置广东/江苏/浙江/四川 + 广州/南京/杭州/成都边界，未收录区域友好降级提示）
- **多图表联动**：地区 / 车辆类型 / 事故类型三维过滤收敛于 Pinia 单一数据源（SSOT），点击地图、玫瑰图扇区、环形图图例，全屏 12 个视图组件同步过滤刷新
- **实时数据刷新**：模拟引擎 5s 周期推送快照（模拟时钟 60 倍加速），双正弦 + 有界随机游走噪声保证数据连续（相邻变化 ≤ ±15%），支持暂停/恢复（冻结时钟、恢复无缝衔接）
- **赛博朋克霓虹视觉**：深空底色 + 霓虹青/品红/紫渐变 + 辉光 + 圆角卡片
- **大屏自适应**：1920×1080 设计稿 transform 等比缩放，1366×768 ~ 2560×1440 无裁切，全屏模式

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Vue 3（组合式 API）+ TypeScript（严格模式） |
| 构建 | Vite 6 |
| 状态管理 | Pinia（SSOT 单 Store） |
| 路由 | Vue Router 4（hash 模式，离线分发零配置） |
| 图表 | ECharts 5（按需引入：Bar/Pie/Line/Heatmap/Map/EffectScatter） |
| 地图数据 | 阿里 DataV areas_v3 geoJSON（本地打包，异步 chunk） |

## 环境要求

- Node.js ≥ 20
- 现代浏览器（Chrome / Edge 最新版）

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 生产构建（产物输出至 dist/，任意静态服务器可托管）
npm run build

# 本地预览生产构建
npm run preview

# TypeScript 类型检查
npm run typecheck
```

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `#/` | 主监控大屏（唯一业务界面） |
| `#/about` | 系统说明页（技术栈 / 三大亮点 / 架构分层，答辩展示用） |

## 工具脚本

### fetch-geo（geoJSON 资源获取与裁剪）

地图边界资源由脚本统一获取并裁剪（仅保留 name/adcode/center/centroid，控制打包体积）：

```bash
# 幂等执行：本地已有文件仅裁剪，缺失则从 DataV 下载
node scripts/fetch-geo.mjs

# 强制重新下载全部 9 份边界
node scripts/fetch-geo.mjs --force

# 查看下载目标清单
node scripts/fetch-geo.mjs --list

# 导出省/市质心坐标表（供 mock 引擎生成事故散点坐标）
node scripts/fetch-geo.mjs --dump-centroids

# 完整帮助
node scripts/fetch-geo.mjs --help
```

下载源：`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`；单文件失败可直接重跑（已成功文件自动跳过）。

## 目录结构

```
毕业设计/frontend/          # 本目录 = 前端工程根（Vue 3 + Vite）
├── scripts/fetch-geo.mjs   # geoJSON 获取与裁剪 CLI
├── tests/                  # mock 引擎自动化测试（npm test）
└── src/
    ├── views/              # ScreenView（主大屏）/ AboutView（说明页）
    ├── components/         # ScreenLayout、KpiCard、ChartCard、FilterTagBar、charts/*
    ├── composables/        # useECharts / useScreenAdapter
    ├── stores/screen.ts    # Pinia SSOT：快照 + 三维过滤 + 钻取栈
    ├── mock/               # 模拟数据引擎（entities/noise/aggregate/engine/constants）
    ├── services/           # mapRegistry（geoJSON 懒加载 + registerMap 缓存）
    ├── chart/              # ECharts 按需注册 + neon 霓虹主题
    ├── assets/geo/         # 全国 + 4 省 + 4 市 geoJSON（异步 chunk）
    ├── styles/             # 霓虹设计令牌 / 全局样式 / 卡片通用类
    └── types/              # 全局领域类型
```

## 答辩演示要点

1. 打开大屏 → 观察 5s 周期实时刷新与 KPI 数字脉冲
2. 点击地图 **广东省** → 下钻市级视图，全部图表联动为省内数据
3. 点击 **广州市** → 三级下钻；「返回上一级」逐级回退
4. 点击事故玫瑰图 **追尾** 扇区 → 地图散点与 KPI 按事故类型过滤；再点一次取消
5. 点击车辆环形图 **小汽车** 图例 → TOP10 排行按类型流量重排序
6. 点击 **暂停刷新** → 数据冻结（KPI 不再变化）；恢复后数值连续无跳变
7. 缩放浏览器窗口 → 大屏等比自适应；进入全屏 → 重新贴合
8. DevTools 切 Offline → 全部功能照常（纯前端离线演示）

## 相关文档

文档位于上级 `毕业设计/` 目录，按毕业设计阶段组织：

- [需求规格说明书](../requirements/需求规格说明书.md)（EARS 格式，21 FR + 12 NFR）
- [用例图](../requirements/用例图.puml) / [需求追踪矩阵](../requirements/需求追踪矩阵.md)
- [系统设计文档](../design/系统设计文档.md)（架构 / 组件契约 / 数据流 / ADR）
- [架构图](../design/架构图.puml) / [数据实体模型图](../design/数据实体模型图.puml) / [前端数据契约](../design/api-contract.yaml)
- [实施任务清单](../docs/tasks.md)（8 批次 38 任务 + 验收自测清单）
- [测试报告](../docs/test-report.md)（6 自动化用例 + 21 验收场景 + 实测指标）
- [毕业论文](../thesis/毕业论文.md)（七章全文，占位符待填）
- 答辩材料：[答辩PPT大纲](../defense/答辩PPT大纲.md) / [演示脚本](../defense/演示脚本.md) / [预测QA](../defense/预测QA.md)（38 题）