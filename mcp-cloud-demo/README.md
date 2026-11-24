# 华为云 ECS MCP Server

将华为云 ECS（弹性云服务器）开放 API 封装为 MCP（Model Context Protocol）工具的 stdio 服务器。基于官方 `@modelcontextprotocol/sdk`，使用 AK/SK（SDK-HMAC-SHA256）签名直连华为云开放 API，除 MCP SDK 外零第三方依赖（签名基于 Node 内置 `node:crypto` 实现）。

> ICT 大赛赛题 8「MCP-如何将华为云服务封装成MCP Server」作品。

## 工具清单（4 个，只读优先）

| 工具 | 华为云 API | 说明 |
|------|-----------|------|
| `list_servers` | `GET /v1/{project_id}/cloudservers/detail` | 查询云服务器列表（limit/offset/名称过滤） |
| `show_server` | `GET /v1/{project_id}/cloudservers/{server_id}` | 查询单台云服务器详情 |
| `list_availability_zones` | `GET /v1/{project_id}/availability-zones` | 查询当前区域可用区 |
| `get_project_id` | `GET /v3/projects`（IAM） | 查询区域对应的 IAM 项目 ID |

## 快速开始

```bash
npm install
npm test        # 全量测试（16 组，含签名向量与错误契约锁定）
npm start       # 启动 stdio MCP 服务器
```

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `HUAWEI_AK` | 是 | 访问密钥 AK（控制台「我的凭证 → 访问密钥」获取） |
| `HUAWEI_SK` | 是 | 访问密钥 SK |
| `HUAWEI_REGION` | 否 | 区域名，默认 `cn-north-4` |
| `HUAWEI_PROJECT_ID` | 否 | IAM 项目 ID；不配置时自动通过 `GET /v3/projects` 按区域解析并缓存 |

### MCP 客户端配置示例

```json
{
  "mcpServers": {
    "huawei-ecs": {
      "command": "node",
      "args": ["D:/ICT/mcp-cloud-demo/index.mjs"],
      "env": {
        "HUAWEI_AK": "<你的AK>",
        "HUAWEI_SK": "<你的SK>",
        "HUAWEI_REGION": "cn-north-4"
      }
    }
  }
}
```

## 架构

```
index.mjs          stdio 入口（连接传输层）
server.mjs         buildServer：工具注册与组装（可注入 client，便于测试）
src/tools.mjs      工具定义（名称/描述/zod schema，纯数据）
src/handlers.mjs   工具处理器：白名单提取 + 参数兜底校验 + 统一错误转换
src/client.mjs     华为云 API 客户端：签名、请求、project_id 自动解析
src/errors.mjs     错误契约：结构化中文错误 + 异常类型
test/              node:test 全量测试（fetch 注入，不打真实网络）
```

## 封装方法论（赛题主旨）

1. **工具面设计**：从开放 API 中挑选只读优先、语义清晰的接口映射为工具；工具名与参数用 snake_case，参数约束（范围/正则/枚举）直接表达为 JSON Schema（zod）。
2. **AK/SK 签名（SDK-HMAC-SHA256）**：
   - 构造 `CanonicalRequest` = Method + CanonicalURI（不以 `/` 结尾时补 `/`）+ CanonicalQueryString（RFC3986 编码、字典序排序）+ CanonicalHeaders（每行 `name:value\n`）+ SignedHeaders + Hex(SHA256(body))
   - 签名头固定为 `host;x-sdk-date`（content-type 随请求发送但不参与签名），时间戳为 ISO 基本格式 `YYYYMMDDTHHMMSSZ`（UTC）
   - `StringToSign` = `SDK-HMAC-SHA256` + 时间戳 + Hex(SHA256(CanonicalRequest))
   - `Signature` = Hex(HMAC-SHA256(SK, StringToSign))，写入 `Authorization: SDK-HMAC-SHA256 Access=AK, SignedHeaders=..., Signature=...`
   - 仅用 `node:crypto` 实现，零签名库依赖
3. **project_id 解析**：区域级 API 需要项目 ID，客户端在未配置时调用 IAM `GET /v3/projects` 按区域名解析并缓存，免去用户手工查询。
4. **返回字段白名单**：对华为云响应做严格字段提取（如 ECS 的 `OS-EXT-IPS:type` 聚合出私网/弹性公网 IP），剥离 `request_id`/`metadata` 等字段，防止 token 膨胀与敏感信息外泄。
5. **统一错误契约**（全部 `isError: true` 结构化中文输出，不静默吞错）：

| 场景 | error_code | 说明 |
|------|-----------|------|
| 参数非法 | `INVALID_ARGUMENTS` | zod 校验 + handler 兜底校验 |
| 缺配置 | `MISSING_CONFIG` | 提示所需环境变量 |
| 网络异常 | `NETWORK_ERROR` | 含超时中断（AbortController） |
| API 报错 | 透传 `error_code`/`error_msg`/`http_status` | 剥离 `request_id` 等附加字段 |

## 测试

`npm test`（node:test）覆盖：RFC3986 编码与查询串排序、CanonicalRequest 精确串断言（含 canonicalHeaders 双换行细节）、签名确定性与密钥敏感性、四个工具的返回字段白名单（`Object.keys` 严格锁定）、四类错误契约、project_id 自动解析与缓存、PROJECT_NOT_FOUND 透传，共 16 组用例。