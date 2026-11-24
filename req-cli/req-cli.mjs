import { fileURLToPath } from 'node:url';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';

const TRACKER_VALUES = { 2: 'Task', 3: 'Bug', 5: 'Epic', 6: 'Feature', 7: 'Story' };
const PRIORITY_VALUES = { 1: '低', 2: '中', 3: '高' };
const STATUS_VALUES = { 1: '新建', 2: '进行中', 3: '已解决', 4: '测试中', 5: '已关闭', 6: '已拒绝' };
const SEVERITY_VALUES = { 10: '关键', 11: '重要', 12: '一般', 13: '提示' };

const EXIT_SUCCESS = 0;
const EXIT_API_ERROR = 1;
const EXIT_PARAM_ERROR = 2;
const EXIT_NETWORK_ERROR = 3;

const SIGNED_HEADERS = 'content-type;host;x-sdk-date';
const CONTENT_TYPE = 'application/json';

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacSHA256Hex(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

export function formatSdkDate(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

function rfc3986Encode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodePath(pathname) {
  return pathname.split('/').map(rfc3986Encode).join('/');
}

function hostOf(u) {
  const defaultPort = u.protocol === 'https:' ? '443' : '80';
  if (!u.port || u.port === defaultPort) return u.hostname;
  return `${u.hostname}:${u.port}`;
}

export function buildSignature({ method, url, ak, sk, body = '', date = new Date() }) {
  const u = new URL(url);
  const host = hostOf(u);
  const xSdkDate = typeof date === 'string' ? date : formatSdkDate(date);
  let canonicalURI = encodePath(u.pathname) || '/';
  if (!canonicalURI.endsWith('/')) canonicalURI += '/';

  const params = new URLSearchParams(u.search);
  const sortedKeys = [...params.keys()].sort();
  const canonicalQueryString = sortedKeys
    .map((k) => `${rfc3986Encode(k)}=${rfc3986Encode(params.get(k))}`)
    .join('&');

  const canonicalHeaders = `content-type:${CONTENT_TYPE}\nhost:${host}\nx-sdk-date:${xSdkDate}\n`;
  const hashedPayload = sha256Hex(body);

  const canonicalRequest = [
    method, canonicalURI, canonicalQueryString, canonicalHeaders, SIGNED_HEADERS, hashedPayload,
  ].join('\n');

  const hashedCanonicalRequest = sha256Hex(canonicalRequest);
  const stringToSign = `SDK-HMAC-SHA256\n${xSdkDate}\n${hashedCanonicalRequest}`;
  const signature = hmacSHA256Hex(sk, stringToSign);
  const authorization = `SDK-HMAC-SHA256 Access=${ak}, SignedHeaders=${SIGNED_HEADERS}, Signature=${signature}`;

  return { authorization, xSdkDate };
}

export function parseEndpoint(endpoint) {
  const normalized = /^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`;
  try {
    const u = new URL(normalized);
    if (!u.hostname) return null;
    return u;
  } catch {
    return null;
  }
}

const ROOT_HELP = `req-cli - 华为云 CodeArts 需求管理命令行工具

用法：
  req-cli issue create <title> [选项]    创建工作项

子命令：
  issue      工作项管理
    create   创建工作项

环境变量：
  CODEARTS_REQ_ENDPOINT    CodeArts Req 终端节点（可省略 https:// 前缀，自动补全，
                            如 https://projectman-ext.cn-north-4.myhuaweicloud.com）

  CODEARTS_REQ_AK          访问密钥 AK（对应请求头 Authorization 签名）
  CODEARTS_REQ_SK          访问密钥 SK（与 AK 配对用于签名）
  CODEARTS_REQ_PROXY       可选，socks5 代理（如 socks5://127.0.0.1:10808）

退出码：
  0  成功
  1  API 报错
  2  参数错误（含缺少环境变量、终端节点非法）
  3  网络异常

示例：
  req-cli issue create "修复登录bug" --project-id <uuid> --tracker 3 --priority 3

运行 req-cli issue create --help 查看创建工作项的完整选项。`;

const ISSUE_HELP = `req-cli issue - 工作项管理

用法：
  req-cli issue create <title> [选项]    创建工作项

子命令：
  create    创建工作项

示例：
  req-cli issue create "修复登录bug" --project-id <uuid> --tracker 3 --priority 3

运行 req-cli issue create --help 查看完整选项。`;

const CREATE_HELP = `req-cli issue create <title>   创建工作项（对应 CreateIssueV4，POST /v4/projects/{project_id}/issue）
  --project-id <uuid>          项目32位UUID（必填）
  --tracker <2|3|5|6|7>        工作项类型（必填）：2 Task / 3 Bug / 5 Epic / 6 Feature / 7 Story
  --priority <1|2|3>           优先级（必填）：1 低 / 2 中 / 3 高
  --description <text>         工作项描述（选填）
  --status-id <1..6>           状态（选填，默认 1 新建）
  --severity <10..13>          重要程度（选填）：10 关键 / 11 重要 / 12 一般 / 13 提示
  --assigned-to <n>            处理人数字 id（选填）
  --parent-issue <n>           父工作项 ID（选填，创建子工作项时用）
  --iteration <n>              迭代 ID（选填）
  --begin / --end <yyyy-mm-dd> 开始 / 结束时间（选填）
  --json                       以 JSON 输出响应（工作项 id、name、tracker、status 等）
  --help                       显示本帮助

环境变量：
  CODEARTS_REQ_ENDPOINT        需求管理终端节点
  CODEARTS_REQ_AK              华为云访问密钥 Access Key Id
  CODEARTS_REQ_SK              华为云访问密钥 Secret Access Key（AK/SK 签名鉴权）

示例：
  req-cli issue create "登录页白屏" --project-id 526cefde... --tracker 3 --priority 3 --json`;

function kebabToCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseOptions(args) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const camelKey = kebabToCamel(arg.slice(2, eqIdx));
        const rawValue = arg.slice(eqIdx + 1);
        opts[camelKey] = camelKey === 'json'
          ? !['false', '0', 'no'].includes(rawValue.toLowerCase())
          : rawValue;
      } else {
        const camelKey = kebabToCamel(arg.slice(2));
        if (camelKey === 'json') {
          opts.json = true;
          continue;
        }
        const value = args[i + 1];
        if (value === undefined || value.startsWith('--')) {
          opts[camelKey] = true;
        } else {
          opts[camelKey] = value;
          i++;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { opts, positional };
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
    || /^[0-9a-f]{32}$/i.test(str);
}

function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function isPositiveInteger(str) {
  return /^\d+$/.test(str) && Number(str) > 0;
}

function validateParams(params) {
  const errors = [];

  if (!params.title) {
    errors.push('缺少必填参数：工作项标题 <title>');
  } else {
    const len = [...params.title].length;
    if (len < 1 || len > 512) {
      errors.push(`标题长度必须在 1~512 字符之间，当前 ${len} 字符`);
    }
  }

  if (!params.projectId) {
    errors.push('缺少必填参数：--project-id（项目32位UUID）');
  } else if (!isValidUUID(params.projectId)) {
    errors.push('--project-id 格式不正确，应为32位UUID');
  }

  if (params.tracker === undefined) {
    errors.push('缺少必填参数：--tracker（2 Task / 3 Bug / 5 Epic / 6 Feature / 7 Story）');
  } else if (!TRACKER_VALUES.hasOwnProperty(Number(params.tracker))) {
    errors.push('--tracker 非法，允许值：2 Task / 3 Bug / 5 Epic / 6 Feature / 7 Story');
  }

  if (params.priority === undefined) {
    errors.push('缺少必填参数：--priority（1 低 / 2 中 / 3 高）');
  } else if (!PRIORITY_VALUES.hasOwnProperty(Number(params.priority))) {
    errors.push('--priority 非法，允许值：1 低 / 2 中 / 3 高');
  }

  if (params.statusId !== undefined && !STATUS_VALUES.hasOwnProperty(Number(params.statusId))) {
    errors.push('--status-id 非法，允许值：1 新建 / 2 进行中 / 3 已解决 / 4 测试中 / 5 已关闭 / 6 已拒绝');
  }

  if (params.severity !== undefined && !SEVERITY_VALUES.hasOwnProperty(Number(params.severity))) {
    errors.push('--severity 非法，允许值：10 关键 / 11 重要 / 12 一般 / 13 提示');
  }

  if (params.assignedTo !== undefined && !isPositiveInteger(params.assignedTo)) {
    errors.push('--assigned-to 应为正整数 ID');
  }

  if (params.parentIssue !== undefined && !isPositiveInteger(params.parentIssue)) {
    errors.push('--parent-issue 应为正整数 ID');
  }

  if (params.iteration !== undefined && !isPositiveInteger(params.iteration)) {
    errors.push('--iteration 应为正整数 ID');
  }

  if (params.begin !== undefined && !isValidDate(params.begin)) {
    errors.push('--begin 日期格式不正确，应为 yyyy-mm-dd');
  }

  if (params.end !== undefined && !isValidDate(params.end)) {
    errors.push('--end 日期格式不正确，应为 yyyy-mm-dd');
  }

  return errors;
}

function buildRequestBody(params) {
  const body = {
    name: params.title,
    tracker_id: Number(params.tracker),
    priority_id: Number(params.priority),
    status_id: params.statusId !== undefined ? Number(params.statusId) : 1,
  };
  if (params.description !== undefined) body.description = params.description;
  if (params.severity !== undefined) body.severity_id = Number(params.severity);
  if (params.assignedTo !== undefined) body.assigned_id = Number(params.assignedTo);
  if (params.parentIssue !== undefined) body.parent_issue_id = Number(params.parentIssue);
  if (params.iteration !== undefined) body.iteration_id = Number(params.iteration);
  if (params.begin !== undefined) body.begin_time = params.begin;
  if (params.end !== undefined) body.end_time = params.end;
  return body;
}

function socks5Connect({ proxyHost, proxyPort, targetHost, targetPort }) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, proxyHost);
    let stage = 0;
    socket.on('error', reject);
    socket.on('data', (data) => {
      if (stage === 0) {
        if (data[0] !== 0x05 || data[1] !== 0x00) { reject(new Error('socks5 握手失败')); return; }
        stage = 1;
        const h = Buffer.from(targetHost);
        socket.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, h.length]), h, Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff])]));
      } else if (stage === 1) {
        if (data[0] !== 0x05 || data[1] !== 0x00) { reject(new Error('socks5 连接失败 rep=' + data[1])); return; }
        socket.removeAllListeners('data');
        const tlsSock = tls.connect({ socket, servername: targetHost, ALPNProtocols: ['http/1.1'] });
        tlsSock.on('secureConnect', () => resolve(tlsSock));
        tlsSock.on('error', reject);
      }
    });
    socket.write(Buffer.from([0x05, 0x01, 0x00]));
  });
}

function decodeChunked(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    const lineEnd = buf.indexOf('\r\n', pos);
    if (lineEnd === -1) break;
    const size = parseInt(buf.slice(pos, lineEnd).toString(), 16);
    if (size === 0) break;
    pos = lineEnd + 2;
    out.push(buf.slice(pos, pos + size));
    pos += size + 2;
  }
  return Buffer.concat(out).toString('utf8');
}

function createProxyFetch(proxyStr) {
  const m = /^socks5?:\/\/([^:]+):(\d+)$/.exec(proxyStr);
  if (!m) throw new Error(`不支持的代理格式：${proxyStr}，当前仅支持 socks5://host:port`);
  const proxy = { host: m[1], port: Number(m[2]) };
  return async (url, init) => {
    const u = new URL(url);
    const headers = {};
    for (const [k, v] of Object.entries(init.headers || {})) headers[k] = v;
    const bodyBuf = init.body ? Buffer.from(init.body, 'utf8') : Buffer.alloc(0);
    const sock = await socks5Connect({
      proxyHost: proxy.host, proxyPort: proxy.port,
      targetHost: u.hostname,
      targetPort: u.port ? Number(u.port) : (u.protocol === 'http:' ? 80 : 443),
    });
    return new Promise((resolve, reject) => {
      const reqLines = [`${init.method || 'GET'} ${u.pathname + u.search} HTTP/1.1`, `Host: ${hostOf(u)}`];
      for (const [k, v] of Object.entries(headers)) reqLines.push(`${k}: ${v}`);
      reqLines.push(`Content-Length: ${bodyBuf.length}`, 'Connection: close', '', '');
      sock.write(reqLines.join('\r\n'));
      if (bodyBuf.length) sock.write(bodyBuf);
      const chunks = [];
      sock.on('data', (c) => chunks.push(c));
      sock.on('end', () => {
        sock.destroy();
        const raw = Buffer.concat(chunks);
        const sep = raw.indexOf('\r\n\r\n');
        const headerStr = raw.slice(0, sep).toString('utf8');
        const bodyRaw = raw.slice(sep + 4);
        const [statusLine, ...hdrLines] = headerStr.split('\r\n');
        const status = parseInt(statusLine.split(' ')[1]);
        const respHeaders = {};
        for (const l of hdrLines) { const i = l.indexOf(':'); if (i > 0) respHeaders[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim(); }
        const bodyStr = respHeaders['transfer-encoding']?.includes('chunked') ? decodeChunked(bodyRaw) : bodyRaw.toString('utf8');
        resolve({ ok: status >= 200 && status < 300, status, json: async () => JSON.parse(bodyStr) });
      });
      sock.on('error', (err) => { sock.destroy(); reject(err); });
    });
  };
}

async function createIssue({ endpoint, ak, sk, projectId, body, fetchFn }) {
  const u = parseEndpoint(endpoint);
  const base = u.pathname.replace(/\/+$/, '');
  const url = `${u.origin}${base}/v4/projects/${rfc3986Encode(projectId)}/issue`;
  const bodyStr = JSON.stringify(body);
  const { authorization, xSdkDate } = buildSignature({ method: 'POST', url, ak, sk, body: bodyStr });
  return fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': CONTENT_TYPE,
      'Authorization': authorization,
      'X-Sdk-Date': xSdkDate,
    },
    body: bodyStr,
  });
}

function fieldValue(val, mapping) {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'object') return val.name ?? val.id ?? JSON.stringify(val);
  if (mapping && mapping[val] !== undefined) return `${val} (${mapping[val]})`;
  return String(val);
}

function formatOutput(data, json, fallbackTitle) {
  if (json) {
    return JSON.stringify(data, null, 2);
  }
  const lines = ['工作项创建成功'];
  const id = data.id ?? data.issue_id;
  if (id !== undefined) lines.push(`  ID:       ${id}`);
  const name = data.name ?? data.subject ?? fallbackTitle;
  if (name !== undefined) lines.push(`  标题:      ${name}`);
  const tracker = fieldValue(data.tracker, TRACKER_VALUES);
  if (tracker !== undefined) lines.push(`  类型:      ${tracker}`);
  const priority = fieldValue(data.priority, PRIORITY_VALUES);
  if (priority !== undefined) lines.push(`  优先级:    ${priority}`);
  const status = fieldValue(data.status, STATUS_VALUES);
  if (status !== undefined) lines.push(`  状态:      ${status}`);
  const severity = fieldValue(data.severity, SEVERITY_VALUES);
  if (severity !== undefined) lines.push(`  严重程度:  ${severity}`);
  const assigned = data.assigned_user?.name ?? data.assigned_user?.nick_name;
  if (assigned !== undefined && assigned !== null) lines.push(`  处理人:    ${assigned}`);
  return lines.join('\n');
}

export async function run(argv, env = process.env, options = {}) {
  const { fetchFn = globalThis.fetch, stdout = process.stdout, stderr = process.stderr } = options;
  const writeOut = (s) => stdout.write(s + '\n');
  const writeErr = (s) => stderr.write(s + '\n');

  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    writeOut(ROOT_HELP);
    return EXIT_SUCCESS;
  }

  if (argv[0] !== 'issue') {
    writeErr(`未知命令：${argv[0]}`);
    writeErr(ROOT_HELP);
    return EXIT_PARAM_ERROR;
  }

  if (argv.length === 1 || argv[1] === '--help' || argv[1] === '-h') {
    writeOut(ISSUE_HELP);
    return EXIT_SUCCESS;
  }

  if (argv[1] !== 'create') {
    writeErr(`未知子命令：issue ${argv[1]}`);
    writeErr(ISSUE_HELP);
    return EXIT_PARAM_ERROR;
  }

  const remaining = argv.slice(2);
  const { opts, positional } = parseOptions(remaining);

  if (opts.help) {
    writeOut(CREATE_HELP);
    return EXIT_SUCCESS;
  }

  const params = {
    title: positional[0],
    projectId: opts.projectId,
    tracker: opts.tracker,
    priority: opts.priority,
    description: opts.description,
    statusId: opts.statusId,
    severity: opts.severity,
    assignedTo: opts.assignedTo,
    parentIssue: opts.parentIssue,
    iteration: opts.iteration,
    begin: opts.begin,
    end: opts.end,
    json: opts.json === true,
  };

  const errors = validateParams(params);
  if (errors.length > 0) {
    for (const e of errors) writeErr(e);
    return EXIT_PARAM_ERROR;
  }

  const endpoint = env.CODEARTS_REQ_ENDPOINT;
  const ak = env.CODEARTS_REQ_AK;
  const sk = env.CODEARTS_REQ_SK;
  if (!endpoint || !ak || !sk) {
    const missing = [];
    if (!endpoint) missing.push('CODEARTS_REQ_ENDPOINT');
    if (!ak) missing.push('CODEARTS_REQ_AK');
    if (!sk) missing.push('CODEARTS_REQ_SK');
    writeErr(`缺少环境变量：${missing.join('、')}，请先配置后再运行`);
    return EXIT_PARAM_ERROR;
  }

  if (!parseEndpoint(endpoint)) {
     writeErr('CODEARTS_REQ_ENDPOINT 不是合法的终端节点，形如 https://projectman-ext.cn-north-4.myhuaweicloud.com');
    return EXIT_PARAM_ERROR;
  }

  let effectiveFetch = fetchFn;
  const proxyStr = env.CODEARTS_REQ_PROXY;
  if (proxyStr) {
    try {
      effectiveFetch = createProxyFetch(proxyStr);
    } catch (err) {
      writeErr(err.message);
      return EXIT_PARAM_ERROR;
    }
  }

  const body = buildRequestBody(params);

  let response;
  try {
    response = await createIssue({ endpoint, ak, sk, projectId: params.projectId, body, fetchFn: effectiveFetch });
  } catch (err) {
    const detail = err?.cause?.message ?? err.message;
    writeErr(`网络异常：${detail}`);
    return EXIT_NETWORK_ERROR;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    writeErr(`响应解析失败（HTTP ${response.status}）`);
    return EXIT_API_ERROR;
  }

  if (!response.ok) {
    const errorCode = data.error_code ?? (data.error && data.error.code) ?? 'UNKNOWN';
    const errorMsg = data.error_msg ?? (data.error && data.error.message) ?? JSON.stringify(data);
    writeErr(`API 报错 [${errorCode}]: ${errorMsg}`);
    return EXIT_API_ERROR;
  }

  writeOut(formatOutput(data, params.json, params.title));
  return EXIT_SUCCESS;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}