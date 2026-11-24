import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildSignature } from '../req-cli.mjs';

const REQ_CLI_PATH = fileURLToPath(new URL('../req-cli.mjs', import.meta.url));
const AK = 'test-ak-xxx';
const SK = 'test-sk-xxx';
const UUID = '06f4c4c5-6e3a-4d0b-9c2f-1234567890ab';

const ISSUE_RESPONSE = JSON.stringify({
  id: 12345,
  name: '端到端工作项',
  tracker: { id: 2, name: 'Task' },
  priority: { id: 1, name: '低' },
  status: { id: 1, name: '新建' },
});

function startServer(respond) {
  const seen = [];
  const serverPromise = new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      const u = new URL(req.url, `http://${req.headers.host}`);
      const { authorization } = buildSignature({
        method: req.method,
        url: `http://${req.headers.host}${u.pathname}${u.search}`,
        ak: AK,
        sk: SK,
        body,
        date: req.headers['x-sdk-date'],
      });
      seen.push({
        method: req.method,
        path: u.pathname,
        host: req.headers.host,
        contentType: req.headers['content-type'],
        authorization: req.headers.authorization,
        expectedAuthorization: authorization,
        signatureMatches: req.headers.authorization === authorization,
        sdkDate: req.headers['x-sdk-date'],
        body: JSON.parse(body),
      });
      respond(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
  return { serverPromise, seen };
}

function childEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.CODEARTS_REQ_ENDPOINT;
  delete env.CODEARTS_REQ_AK;
  delete env.CODEARTS_REQ_SK;
  delete env.CODEARTS_REQ_PROXY;
  return { ...env, ...overrides };
}

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [REQ_CLI_PATH, ...args], { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    const timer = setTimeout(() => child.kill(), 15000);
    child.on('error', reject);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

function baseArgs(title) {
  return ['issue', 'create', title, '--project-id', UUID, '--tracker', '2', '--priority', '1'];
}

test('端到端：真实 HTTP 栈下服务端重算签名与 CLI 发送的一致', async () => {
  const { serverPromise, seen } = startServer((res) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(ISSUE_RESPONSE);
  });
  const server = await serverPromise;
  const env = childEnv({
    CODEARTS_REQ_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    CODEARTS_REQ_AK: AK,
    CODEARTS_REQ_SK: SK,
  });
  const { code, stdout, stderr } = await runCli(baseArgs('端到端标题'), env);
  server.close();

  assert.equal(code, 0, stderr);
  assert.match(stdout, /工作项创建成功/);
  assert.match(stdout, /12345/);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].method, 'POST');
  assert.equal(seen[0].path, `/v4/projects/${UUID}/issue`);
  assert.equal(seen[0].contentType, 'application/json');
  assert.equal(seen[0].body.name, '端到端标题');
  assert.equal(seen[0].body.tracker_id, 2);
  assert.equal(seen[0].body.priority_id, 1);
  assert.equal(seen[0].body.status_id, 1);
  assert.ok(/^\d{8}T\d{6}Z$/.test(seen[0].sdkDate));
  assert.ok(
    seen[0].signatureMatches,
    `服务端重算签名与请求不一致\n  收到: ${seen[0].authorization}\n  期望: ${seen[0].expectedAuthorization}`
  );
});

test('端到端：--json 输出完整响应 JSON', async () => {
  const { serverPromise, seen } = startServer((res) => {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(ISSUE_RESPONSE);
  });
  const server = await serverPromise;
  const env = childEnv({
    CODEARTS_REQ_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    CODEARTS_REQ_AK: AK,
    CODEARTS_REQ_SK: SK,
  });
  const { code, stdout, stderr } = await runCli([...baseArgs('端到端标题'), '--json'], env);
  server.close();

  assert.equal(code, 0, stderr);
  assert.equal(JSON.parse(stdout).id, 12345);
  assert.equal(seen[0].signatureMatches, true);
});

test('端到端：API 报错透传 error_code / error_msg，退出码 1', async () => {
  const { serverPromise, seen } = startServer((res) => {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error_code: 'DEVCH.100.401', error_msg: '权限校验失败' }));
  });
  const server = await serverPromise;
  const env = childEnv({
    CODEARTS_REQ_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    CODEARTS_REQ_AK: AK,
    CODEARTS_REQ_SK: SK,
  });
  const { code, stdout, stderr } = await runCli(baseArgs('端到端标题'), env);
  server.close();

  assert.equal(code, 1);
  assert.equal(stdout, '');
  assert.match(stderr, /API 报错 \[DEVCH\.100\.401\]: 权限校验失败/);
  assert.equal(seen[0].signatureMatches, true);
});

test('端到端：网络不可达退出码 3', async () => {
  const env = childEnv({
    CODEARTS_REQ_ENDPOINT: 'http://127.0.0.1:1',
    CODEARTS_REQ_AK: AK,
    CODEARTS_REQ_SK: SK,
  });
  const { code, stderr } = await runCli(baseArgs('端到端标题'), env);
  assert.equal(code, 3);
  assert.match(stderr, /网络异常/);
});

test('端到端：缺环境变量退出码 2 且不发请求', async () => {
  const { serverPromise, seen } = startServer((res) => {
    res.statusCode = 200;
    res.end(ISSUE_RESPONSE);
  });
  const server = await serverPromise;
  const env = childEnv({
    CODEARTS_REQ_ENDPOINT: `http://127.0.0.1:${server.address().port}`,
    CODEARTS_REQ_AK: AK,
  });
  const { code, stderr } = await runCli(baseArgs('端到端标题'), env);
  server.close();

  assert.equal(code, 2);
  assert.match(stderr, /缺少环境变量：CODEARTS_REQ_SK/);
  assert.equal(seen.length, 0);
});