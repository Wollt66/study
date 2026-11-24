# 答辩 PPT 大纲（共 14 页）

## 第1页：封面
- 标题：基于微服务架构的个人任务完成情况跟踪系统设计与实现
- 副标题：毕业设计答辩
- 答辩人：CWL
- 指导教师：XXX
- 日期：2026年X月

## 第2页：目录
1. 研究背景与意义
2. 需求分析
3. 系统设计
4. 系统实现
5. 系统测试
6. 总结与展望

## 第3页：研究背景
- 个人任务管理工具的现状与痛点（单体架构、缺乏完成情况统计）
- 微服务架构的发展趋势
- 本课题的研究意义

## 第4页：需求分析
- 四大功能模块：用户管理、任务管理、完成跟踪、统计报表
- 核心用例：任务状态流转（TODO→IN_PROGRESS→DONE）
- 非功能需求：P95<200ms、JWT鉴权、Docker一键部署

## 第5页：总体架构
- 4个微服务架构图（user/task/tracking/report-service）
- 端口分配：3001/3002/3003/3004
- 服务间调用关系

## 第6页：技术选型
- Node.js 18 + TypeScript 5 + Express 4
- SQLite（better-sqlite3）独立数据库
- JWT + bcrypt 鉴权
- zod 参数校验、pino 日志、Docker Compose 编排

## 第7页：数据库设计
- users 表、tasks 表 + outbox 表、completions 表 + status_logs 表
- 每服务独立数据库
- 索引设计

## 第8页：关键技术——Outbox 最终一致性
- 问题：task-service 通知 tracking-service 时下游不可用
- 方案：本地事务写 outbox → 后台 Worker 每 30s 重试 → 指数退避 5 次
- 优势：主流程不阻塞，最终一致

## 第9页：关键技术——游标分页
- 传统 OFFSET 分页的问题（数据变动错位、大偏移量性能差）
- 游标分页：base64({sortField, sortValue})，WHERE created_at < ?
- 对比 GitHub API / Twitter API 方案

## 第10页：系统实现——核心流程
- 注册→登录→创建任务→标记完成→查询进度→查询报表
- 现场演示 curl 调用链路

## 第11页：安全设计
- JWT 无状态鉴权（各服务本地验证）
- bcrypt 密码加密
- X-Internal-Token 服务间信任
- 越权防护（SQL 层 user_id 隔离）

## 第12页：系统测试
- 功能测试结果（注册/登录/任务CRUD/状态流转/报表）
- 安全性测试（密码加密、越权拦截）
- 容错测试（tracking 不可用时 outbox 补偿）

## 第13页：总结与展望
- 完成的工作：4微服务、完整功能、Outbox补偿、游标分页、Docker部署
- 不足：无前端界面、SQLite 并发能力有限、未引入服务注册中心
- 展望：开发前端管理界面、替换为 PostgreSQL、引入消息队列、增加数据可视化

## 第14页：致谢
- 感谢指导老师、同学、家人
- 请各位老师批评指正
