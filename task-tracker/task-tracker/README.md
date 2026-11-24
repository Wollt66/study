# 个人任务完成情况跟踪系统（task-tracker）

基于微服务架构的个人任务管理与完成情况统计系统，支持任务全生命周期管理、完成事件追溯、状态流转审计与多维度统计报表。

## 架构说明

系统由 4 个独立微服务组成，各服务拥有独立数据库，通过 REST API 通信：

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│ user-service│     │ task-service│     │ tracking-service│     │report-service│
│   :3001     │     │   :3002     │     │     :3003       │     │    :3004     │
│ 用户/鉴权   │◄───►│ 任务CRUD    │────►│ 完成事件/日志   │◄───►│ 统计报表/趋势 │
│ JWT签发     │     │ 状态机/outbox│     │ 进度查询        │     │ 实时聚合     │
└─────────────┘     └─────────────┘     └─────────────────┘     └──────────────┘
```

| 服务 | 职责 | 端口 | 数据库 |
|------|------|------|--------|
| user-service | 注册、登录、JWT 签发、个人信息管理 | 3001 | users 表 |
| task-service | 任务 CRUD、状态流转、outbox 补偿 | 3002 | tasks + outbox 表 |
| tracking-service | 完成事件记录、状态日志、进度查询 | 3003 | completions + status_logs 表 |
| report-service | 汇总统计、日/周/月报表、趋势分析 | 3004 | 无（实时聚合） |

## 技术栈

- **运行时**：Node.js 18+
- **语言**：TypeScript 5
- **Web 框架**：Express 4
- **数据库**：SQLite（better-sqlite3，每服务独立文件）
- **鉴权**：JWT（jsonwebtoken）+ bcrypt 密码加密
- **入参校验**：zod
- **日志**：pino 结构化日志（含 requestId 链路追踪）
- **测试**：Jest + Supertest
- **容器化**：Docker + docker-compose
- **Monorepo**：npm workspaces

## 目录结构

```
task-tracker/
├── services/
│   ├── user-service/        # :3001 用户服务
│   ├── task-service/        # :3002 任务服务
│   ├── tracking-service/    # :3003 跟踪服务
│   └── report-service/      # :3004 报表服务
├── shared/                  # 共享包（@task-tracker/shared）
│   └── src/
│       ├── types.ts         # ApiResponse / PaginatedResponse / 枚举
│       ├── errorCodes.ts    # 错误码 + AppError
│       ├── response.ts      # ok() / fail()
│       ├── pagination.ts    # 游标编解码
│       ├── httpClient.ts    # 超时/重试/降级
│       └── logger.ts        # pino + requestId 中间件
├── docker-compose.yml
├── package.json             # npm workspace 根
└── README.md
```

## 快速开始

### 前置条件

- Node.js 18+
- （可选）Docker + Docker Compose

### 本地开发

```bash
# 1. 安装依赖（根目录执行）
npm install

# 2. 编译 shared 包
cd shared && npm run build && cd ..

# 3. 分别启动 4 个服务（开 4 个终端）
npm run dev:user       # :3001
npm run dev:task       # :3002
npm run dev:tracking   # :3003
npm run dev:report     # :3004
```

### Docker 一键启动

```bash
docker-compose up --build
```

启动后访问各服务健康检查：
- http://localhost:3001/api/users/health
- http://localhost:3002/api/tasks/health
- http://localhost:3003/api/tracking/health
- http://localhost:3004/api/reports/health

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| JWT_SECRET | JWT 签名密钥（所有服务必须一致） | 无（必填） |
| INTERNAL_TOKEN | 服务间调用信任令牌（所有服务必须一致） | 无（必填） |
| PORT | 服务监听端口 | 各服务默认 3001-3004 |
| DB_PATH | SQLite 数据库文件路径 | ./data/<service>.sqlite |
| TRACKING_SERVICE_URL | tracking-service 地址 | http://localhost:3003/api |
| TASK_SERVICE_URL | task-service 地址 | http://localhost:3002/api |
| HTTP_TIMEOUT_MS | 服务间调用超时（毫秒） | 3000 |
| LOG_LEVEL | 日志级别 | info |

## API 文档

### 统一响应格式

```json
{ "code": 0, "message": "ok", "data": {} }
```

- `code=0` 成功；非零为业务错误码，此时 `data=null`
- 分页接口返回 `{ items, nextCursor, hasMore }`

### 统一错误码

| 错误码 | 含义 | HTTP |
|--------|------|------|
| 0 | 成功 | 200 |
| 1001 | 参数错误 | 400 |
| 1002 | 未认证（Token 无效/过期） | 401 |
| 1003 | 无权限（越权/禁止字段） | 403 |
| 1004 | 内部调用未授权 | 401 |
| 2002 | 用户名或密码错误 | 401 |
| 2003 | 用户名或邮箱已存在 | 409 |
| 2004 | 邮箱已占用 | 409 |
| 3001 | 任务不存在或无权限 | 404 |
| 4001 | 非法状态流转 | 400 |
| 5001 | 服务器内部错误 | 500 |
| 5031 | 下游服务不可用 | 503 |

### 核心接口

**user-service**
- `POST /api/users/register` — 注册
- `POST /api/users/login` — 登录（返回 JWT）
- `GET /api/users/profile` — 获取个人信息（需鉴权）
- `PUT /api/users/profile` — 更新个人信息（需鉴权）

**task-service**
- `POST /api/tasks` — 创建任务
- `GET /api/tasks` — 任务列表（游标分页 + 过滤）
- `GET /api/tasks/:id` — 任务详情
- `PUT /api/tasks/:id` — 编辑任务
- `DELETE /api/tasks/:id` — 删除任务
- `PATCH /api/tasks/:id/status` — 状态流转（TODO→IN_PROGRESS→DONE，DONE 可重开为 IN_PROGRESS）

**tracking-service**
- `GET /api/tracking/progress` — 完成进度（completed/inProgress/todo/completionRate）
- `GET /api/tracking/completions` — 完成历史（游标分页）
- `GET /api/tracking/status-logs` — 状态变更日志（游标分页）

**report-service**
- `GET /api/reports/summary?startDate=&endDate=` — 完成汇总
- `GET /api/reports/daily?startDate=&endDate=` — 日报表
- `GET /api/reports/weekly` — 周报表
- `GET /api/reports/monthly` — 月报表
- `GET /api/reports/trend?period=daily|weekly|monthly` — 趋势分析

## 服务间调用与容错

- **task → tracking**：任务状态变更时同步调用 tracking-service 记录完成事件与状态日志；失败时写入本地 outbox 表，由后台 worker 每 30s 扫描重试（最多 5 次，指数退避），主流程不阻塞（最终一致）。
- **report → tracking/task**：报表查询实时聚合下游数据；下游不可用时返回 5031。
- **鉴权**：JWT 在各服务本地校验（共享 JWT_SECRET），无需调用 user-service；服务间调用通过 `X-Internal-Token` 信任。

## 端到端调用示例

```bash
# 1. 注册
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"a@x.com","password":"Pass1234"}'

# 2. 登录
TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"account":"alice","password":"Pass1234"}' | jq -r .data.token)

# 3. 创建任务
curl -X POST http://localhost:3002/api/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"写毕设论文","category":"学习","priority":"high"}'

# 4. 标记完成
curl -X PATCH http://localhost:3002/api/tasks/<taskId>/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"DONE"}'

# 5. 查询进度
curl http://localhost:3003/api/tracking/progress -H "Authorization: Bearer $TOKEN"

# 6. 查询报表
curl "http://localhost:3004/api/reports/summary?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

## 测试

```bash
npm test          # 运行所有 workspace 的测试
```

## 生产部署注意事项

1. `JWT_SECRET` 与 `INTERNAL_TOKEN` 必须使用强随机值，通过环境变量或密钥管理服务下发。
2. SQLite 数据文件通过 docker volume 持久化（user_data / task_data / tracking_data）。
3. 各服务可独立 `docker-compose up <service>` 启停。
4. 生产环境建议将 SQLite 替换为 PostgreSQL/MySQL，各服务数据库独立。
