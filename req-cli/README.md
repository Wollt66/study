# req-cli

华为云 CodeArts 需求管理命令行工具，封装 **CreateIssueV4** API（`POST /v4/projects/{project_id}/issue`）。

## 环境要求

- Node.js >= 18（使用原生 `fetch`，无需安装任何依赖）

## 环境变量

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `CODEARTS_REQ_ENDPOINT` | 是 | CodeArts Req 终端节点（可省略 `https://` 前缀，自动补全） | `https://projectman-ext.cn-north-4.myhuaweicloud.com` |
| `CODEARTS_REQ_AK` | 是 | 访问密钥 AK（用于 SDK-HMAC-SHA256 签名） | 控制台「我的凭证 → 访问密钥」获取 |
| `CODEARTS_REQ_SK` | 是 | 访问密钥 SK（与 AK 配对） | 创建时仅显示一次，妥善保管 |
| `CODEARTS_REQ_PROXY` | 否 | socks5 代理地址 | `socks5://127.0.0.1:10808` |

`CODEARTS_REQ_ENDPOINT`、`CODEARTS_REQ_AK`、`CODEARTS_REQ_SK` 必须配置，缺任意一个（或终端节点非法）程序直接报错退出（退出码 2），不会发送请求。`CODEARTS_REQ_PROXY` 为可选，仅当网络环境需要 socks5 代理时设置（正常网络可直连，无需配置）。

终端节点格式为 `projectman-ext.<区域>.myhuaweicloud.com`，按项目所在区域选择（与官方 SDK `ProjectManRegion` 一致）：

| 区域 | 终端节点 |
|------|----------|
| 华北-北京四 | `https://projectman-ext.cn-north-4.myhuaweicloud.com` |
| 华北-北京一 | `https://projectman-ext.cn-north-1.myhuaweicloud.com` |
| 华东-上海一 | `https://projectman-ext.cn-east-3.myhuaweicloud.com` |
| 华东-上海二 | `https://projectman-ext.cn-east-2.myhuaweicloud.com` |
| 华南-广州 | `https://projectman-ext.cn-south-1.myhuaweicloud.com` |
| 西南-贵阳一 | `https://projectman-ext.cn-southwest-2.myhuaweicloud.com` |
| 中国-香港 | `https://projectman-ext.ap-southeast-3.myhuaweicloud.com` |

```bash
# PowerShell
$env:CODEARTS_REQ_ENDPOINT = "https://projectman-ext.cn-north-4.myhuaweicloud.com"
$env:CODEARTS_REQ_AK       = "你的AK"
$env:CODEARTS_REQ_SK       = "你的SK"

# bash / zsh
export CODEARTS_REQ_ENDPOINT="https://projectman-ext.cn-north-4.myhuaweicloud.com"
export CODEARTS_REQ_AK="你的AK"
export CODEARTS_REQ_SK="你的SK"
```

## 用法

### 创建工作项

```bash
node req-cli.mjs issue create <title> [选项]
```

#### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `<title>` | 是 | 工作项标题，1~512 字符 |

#### 必填选项

| 选项 | 说明 |
|------|------|
| `--project-id <uuid>` | 项目 ID（32位 UUID，支持带连字符或不带连字符两种写法） |
| `--tracker <id>` | 工作项类型：`2` Task / `3` Bug / `5` Epic / `6` Feature / `7` Story |
| `--priority <id>` | 优先级：`1` 低 / `2` 中 / `3` 高 |

#### 选填选项

| 选项 | 说明 |
|------|------|
| `--description <text>` | 工作项描述 |
| `--status-id <id>` | 状态：`1` 新建 / `2` 进行中 / `3` 已解决 / `4` 测试中 / `5` 已关闭 / `6` 已拒绝（默认 `1`） |
| `--severity <id>` | 严重程度：`10` 关键 / `11` 重要 / `12` 一般 / `13` 提示 |
| `--assigned-to <id>` | 处理人数字 ID |
| `--parent-issue <id>` | 父工作项 ID |
| `--iteration <id>` | 迭代 ID |
| `--begin <yyyy-mm-dd>` | 开始日期 |
| `--end <yyyy-mm-dd>` | 结束日期 |
| `--json` | 以 JSON 格式输出响应（也接受 `--json=false` 关闭） |

### 示例

```bash
# 创建一个 Bug
node req-cli.mjs issue create "修复登录页面白屏" \
  --project-id 06f4c4c5-6e3a-4d0b-9c2f-1234567890ab \
  --tracker 3 \
  --priority 3 \
  --severity 11 \
  --description "用户登录后页面白屏，需排查"

# 创建一个 Task 并以 JSON 输出
node req-cli.mjs issue create "编写单元测试" \
  --project-id 06f4c4c5-6e3a-4d0b-9c2f-1234567890ab \
  --tracker 2 \
  --priority 2 \
  --json

# 创建 Story，指定迭代与日期
node req-cli.mjs issue create "用户中心重构" \
  --project-id 06f4c4c5-6e3a-4d0b-9c2f-1234567890ab \
  --tracker 7 \
  --priority 2 \
  --iteration 401 \
  --begin 2024-03-01 \
  --end 2024-04-30
```

### Help

```bash
node req-cli.mjs --help                  # 根 help
node req-cli.mjs issue --help            # issue 子命令 help
node req-cli.mjs issue create --help     # create 完整选项
```

## 鉴权签名

采用华为云 API 网关 **SDK-HMAC-SHA256** 算法（AK/SK），无需token，每次请求实时计算：

1. 生成 `X-Sdk-Date`（UTC 时间，格式 `YYYYMMDDTHHMMSSZ`）
2. 组装 `CanonicalRequest` = HTTP 方法 + `\n` + 规范化 URI + `\n` + 规范化查询串 + `\n` + 规范化请求头 + `\n` + 签名头列表 + `\n` + 请求体的 SHA256 十六进制摘要
3. 组装 `StringToSign` = `SDK-HMAC-SHA256` + `\n` + `X-Sdk-Date` + `\n` + `CanonicalRequest` 的 SHA256 十六进制摘要
4. 以 SK 为密钥对 `StringToSign` 做 HMAC-SHA256，得到 `Signature`
5. 写入请求头：

```
Authorization: SDK-HMAC-SHA256 Access=<AK>, SignedHeaders=content-type;host;x-sdk-date, Signature=<signature>
X-Sdk-Date: <YYYYMMDDTHHMMSSZ>
```

测试中的签名向量由独立的 Python 参考实现交叉计算，保证与官方算法逐字节一致（含 canonicalURI 追加尾部斜杠、host 含非默认端口等细节）。

> 注意：华为云 APIG 签名校验要求 canonicalURI 以 `/` 结尾（如 `/v4/projects/`），而实际 HTTP 请求的 path 不带尾部斜杠（如 `/v4/projects`）——两者是不同的环节，签名与路由各自独立校验。此规则已经真实网关验证。

## 退出码

| 退出码 | 含义 |
|--------|------|
| `0` | 成功 |
| `1` | API 报错（透传 `error_code` / `error_msg`）或响应解析失败 |
| `2` | 参数错误（缺必填、非法值、日期格式不对），以及缺少环境变量、终端节点非法 |
| `3` | 网络异常 |

## 输出

- **默认**：摘要格式（响应无标题字段时回显请求标题）

```
工作项创建成功
  ID:       71214922
  标题:      修复登录页面白屏
  类型:      Bug
  优先级:    中
  状态:      新建
  严重程度:  一般
  处理人:    dev01
```

（格式为真实环境实际输出样例，账号/ID 已替换为占位数据；响应无对应字段时该行自动省略）

- **`--json`**：完整 API 响应的 JSON

## 测试

```bash
npm test
# 或
node --test test/
```

测试使用 `node:test` 内置框架，通过 mock fetch 验证帮助输出、参数校验、环境变量检查、签名算法（固定向量，Python 参考实现交叉计算）、请求构造、响应处理、退出码等；另有 `test/e2e.test.mjs` 起本地 HTTP 服务做子进程端到端验证（服务端重算签名比对），不依赖外部网络。签名算法与终端节点已在真实华为云环境（cn-north-4，scrum 与 ipd 项目）验证通过。

## API 对应

本工具封装华为云 CodeArts 需求管理 **CreateIssueV4** 接口：

- 方法：`POST`
- 路径：`/v4/projects/{project_id}/issue`
- 鉴权：AK/SK 签名（SDK-HMAC-SHA256），请求头 `Authorization` + `X-Sdk-Date`
- 请求体字段映射（字段名与官方 SDK `CreateIssueRequestV4` 模型一致）：

| CLI 选项 | API 请求体字段 |
|----------|---------------|
| `<title>` | `name` |
| `--tracker` | `tracker_id` |
| `--priority` | `priority_id` |
| `--status-id` | `status_id` |
| `--severity` | `severity_id` |
| `--description` | `description` |
| `--assigned-to` | `assigned_id` |
| `--parent-issue` | `parent_issue_id` |
| `--iteration` | `iteration_id` |
| `--begin` | `begin_time` |
| `--end` | `end_time` |