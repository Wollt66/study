import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rfc3986Encode,
  formatSdkDate,
  buildCanonicalQuery,
  buildCanonicalRequest,
  buildAuthorization,
  HuaweiCloudClient,
} from '../src/client.mjs';
import { handlers } from '../src/handlers.mjs';
import { TOOLS } from '../src/tools.mjs';

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function mockFetchJson(json, { status = 200 } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return { ok: status < 400, status, text: async () => JSON.stringify(json) };
  };
  fn.calls = calls;
  return fn;
}

function makeClient(overrides = {}) {
  return new HuaweiCloudClient({
    ak: 'test-ak',
    sk: 'test-sk',
    region: 'cn-north-4',
    projectId: 'pid-0001',
    fetchImpl: mockFetchJson({}),
    ...overrides,
  });
}

const SAMPLE_SERVER = {
  id: '6dd6bb58-77ac-4bd1-8812-6f1a1c000001',
  name: 'demo-ecs',
  status: 'ACTIVE',
  flavor: { vcpus: '2', ram: '4096' },
  image: { id: '151dc6ec-1ac2-4b4c-8b3c-0f1a2b3c4d5e' },
  addresses: {
    'subnet-abc': [
      { version: '4', addr: '192.168.1.10', 'OS-EXT-IPS:type': 'fixed' },
      { version: '4', addr: '1.2.3.4', 'OS-EXT-IPS:type': 'floating' },
    ],
  },
  'OS-EXT-AZ:availability_zone': 'cn-north-4a',
  'OS-EXT-STS:vm_state': 'active',
  security_groups: [{ name: 'default-sg' }],
  created: '2026-10-01T08:00:00Z',
  updated: '2026-10-02T08:00:00Z',
  metadata: { should: 'be-dropped' },
};

test('rfc3986Encode 编码保留字', () => {
  assert.equal(rfc3986Encode('a b!c'), 'a%20b%21c');
  assert.equal(rfc3986Encode('中文'), encodeURIComponent('中文'));
});

test('formatSdkDate 输出 ISO 基本格式时间戳', () => {
  assert.equal(formatSdkDate(new Date('2026-10-31T00:00:00.123Z')), '20261031T000000Z');
});

test('buildCanonicalQuery 过滤空值并按字典序排序', () => {
  assert.equal(buildCanonicalQuery({ b: '2', a: '1' }), 'a=1&b=2');
  assert.equal(buildCanonicalQuery({ a: 'x', empty: '', nil: null, undef: undefined }), 'a=x');
});

test('buildCanonicalRequest 拼装精确串（URI 补尾斜杠 + canonicalHeaders 自带换行形成双换行）', () => {
  const cr = buildCanonicalRequest({
    method: 'GET',
    path: '/v1/pid-0001/cloudservers/detail',
    query: 'limit=10',
    headers: {
      host: 'ecs.cn-north-4.myhuaweicloud.com',
      'x-sdk-date': '20261031T000000Z',
    },
    body: '',
  });
  assert.equal(
    cr,
    'GET\n/v1/pid-0001/cloudservers/detail/\nlimit=10\n' +
      'host:ecs.cn-north-4.myhuaweicloud.com\nx-sdk-date:20261031T000000Z\n\n' +
      `host;x-sdk-date\n${EMPTY_SHA256}`
  );
});

test('buildAuthorization 格式、确定性与密钥敏感性', () => {
  const args = {
    method: 'GET',
    path: '/v3/projects',
    query: '',
    headers: { host: 'iam.myhuaweicloud.com', 'x-sdk-date': '20261031T000000Z' },
    body: '',
    ak: 'test-ak',
    timestamp: '20261031T000000Z',
  };
  const a1 = buildAuthorization({ ...args, sk: 'test-sk' });
  assert.match(
    a1,
    /^SDK-HMAC-SHA256 Access=test-ak, SignedHeaders=host;x-sdk-date, Signature=[0-9a-f]{64}$/
  );
  assert.equal(buildAuthorization({ ...args, sk: 'test-sk' }), a1);
  assert.notEqual(buildAuthorization({ ...args, sk: 'other-sk' }), a1);
});

test('工具清单锁定（snake_case 命名）', () => {
  assert.deepEqual(TOOLS.map((t) => t.name), ['list_servers', 'show_server', 'list_availability_zones', 'get_project_id']);
});

test('list_servers 返回字段白名单（锁定 keys + 剥离多余字段）', async () => {
  const fetchImpl = mockFetchJson({ count: 1, servers: [SAMPLE_SERVER], request_id: 'should-drop' });
  const client = makeClient({ fetchImpl });
  const result = await handlers.list_servers({}, client);
  assert.equal(result.isError, undefined);
  const data = JSON.parse(result.content[0].text);
  assert.deepEqual(Object.keys(data), ['total', 'servers']);
  assert.deepEqual(Object.keys(data.servers[0]), [
    'id', 'name', 'status', 'vcpus', 'ram_mb', 'private_ips', 'floating_ips', 'availability_zone', 'created_at',
  ]);
  assert.deepEqual(data.servers[0].private_ips, ['192.168.1.10']);
  assert.deepEqual(data.servers[0].floating_ips, ['1.2.3.4']);
  assert.equal(fetchImpl.calls[0].url, 'https://ecs.cn-north-4.myhuaweicloud.com/v1/pid-0001/cloudservers/detail?limit=25&offset=0');
  assert.match(fetchImpl.calls[0].init.headers.authorization, /^SDK-HMAC-SHA256 Access=test-ak/);
});

test('list_servers 参数越界返回 INVALID_ARGUMENTS', async () => {
  const client = makeClient();
  const result = await handlers.list_servers({ limit: 1001 }, client);
  assert.equal(result.isError, true);
  const data = JSON.parse(result.content[0].text);
  assert.deepEqual(Object.keys(data), ['error_code', 'error_msg']);
  assert.equal(data.error_code, 'INVALID_ARGUMENTS');
  assert.match(data.error_msg, /limit/);
});

test('show_server 返回详情白名单', async () => {
  const fetchImpl = mockFetchJson({ server: SAMPLE_SERVER });
  const client = makeClient({ fetchImpl });
  const result = await handlers.show_server({ server_id: SAMPLE_SERVER.id }, client);
  const data = JSON.parse(result.content[0].text);
  assert.deepEqual(Object.keys(data), [
    'id', 'name', 'status', 'vm_state', 'vcpus', 'ram_mb', 'image_id',
    'private_ips', 'floating_ips', 'availability_zone', 'security_group_names', 'created_at', 'updated_at',
  ]);
  assert.equal(fetchImpl.calls[0].url, `https://ecs.cn-north-4.myhuaweicloud.com/v1/pid-0001/cloudservers/${SAMPLE_SERVER.id}`);
});

test('show_server 非法 server_id 返回 INVALID_ARGUMENTS', async () => {
  const client = makeClient();
  const result = await handlers.show_server({ server_id: 'not-a-uuid' }, client);
  assert.equal(result.isError, true);
  assert.equal(JSON.parse(result.content[0].text).error_code, 'INVALID_ARGUMENTS');
});

test('缺少 AK/SK 返回 MISSING_CONFIG', async () => {
  const client = makeClient({ ak: undefined, sk: undefined });
  const result = await handlers.list_servers({}, client);
  assert.equal(result.isError, true);
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.error_code, 'MISSING_CONFIG');
  assert.match(data.error_msg, /HUAWEI_AK/);
  assert.match(data.error_msg, /HUAWEI_SK/);
});

test('华为云 API 错误透传（剥离 request_id，附 http_status）', async () => {
  const fetchImpl = mockFetchJson({ error_code: 'ECS.0001', error_msg: 'boom', request_id: 'req-1' }, { status: 409 });
  const client = makeClient({ fetchImpl });
  const result = await handlers.list_servers({}, client);
  assert.equal(result.isError, true);
  const data = JSON.parse(result.content[0].text);
  assert.deepEqual(Object.keys(data), ['error_code', 'error_msg', 'http_status']);
  assert.equal(data.error_code, 'ECS.0001');
  assert.equal(data.http_status, 409);
});

test('网络异常返回 NETWORK_ERROR', async () => {
  const fetchImpl = async () => { throw new TypeError('fetch failed'); };
  const client = makeClient({ fetchImpl });
  const result = await handlers.list_servers({}, client);
  assert.equal(result.isError, true);
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.error_code, 'NETWORK_ERROR');
  assert.match(data.error_msg, /fetch failed/);
});

test('list_availability_zones 白名单', async () => {
  const fetchImpl = mockFetchJson({ availabilityZoneInfo: [{ zoneName: 'cn-north-4a', zoneState: { available: true }, zoneId: 'drop-me' }] });
  const client = makeClient({ fetchImpl });
  const result = await handlers.list_availability_zones({}, client);
  const data = JSON.parse(result.content[0].text);
  assert.deepEqual(Object.keys(data), ['availability_zones']);
  assert.deepEqual(Object.keys(data.availability_zones[0]), ['zone_name', 'available']);
  assert.equal(data.availability_zones[0].zone_name, 'cn-north-4a');
  assert.equal(data.availability_zones[0].available, true);
});

test('get_project_id 按 region 过滤', async () => {
  const fetchImpl = mockFetchJson({ projects: [{ id: 'p1', name: 'cn-north-4' }, { id: 'p2', name: 'cn-east-3' }] });
  const client = makeClient({ fetchImpl });
  const result = await handlers.get_project_id({}, client);
  const data = JSON.parse(result.content[0].text);
  assert.deepEqual(Object.keys(data), ['region', 'project_id', 'project_count']);
  assert.equal(data.project_id, 'p1');
  assert.equal(data.project_count, 2);
  assert.equal(fetchImpl.calls[0].url, 'https://iam.myhuaweicloud.com/v3/projects');
});

test('requireProjectId 自动解析 IAM 项目并缓存（仅一次 IAM 请求）', async () => {
  const fetchImpl = mockFetchJson({ projects: [{ id: 'auto-pid', name: 'cn-north-4' }] });
  const client = makeClient({ projectId: undefined, fetchImpl });
  const listFetch = mockFetchJson({ servers: [], count: 0 });
  client.fetchImpl = async (url, init) => {
    if (url.includes('/v3/projects')) return fetchImpl(url, init);
    return listFetch(url, init);
  };
  await handlers.list_servers({}, client);
  await handlers.list_servers({}, client);
  const iamCalls = fetchImpl.calls.filter((c) => c.url.includes('/v3/projects'));
  assert.equal(iamCalls.length, 1);
  assert.equal(listFetch.calls[0].url, 'https://ecs.cn-north-4.myhuaweicloud.com/v1/auto-pid/cloudservers/detail?limit=25&offset=0');
});

test('requireProjectId 找不到区域项目时透传 PROJECT_NOT_FOUND', async () => {
  const fetchImpl = mockFetchJson({ projects: [{ id: 'p2', name: 'cn-east-3' }] });
  const client = makeClient({ projectId: undefined, fetchImpl });
  const result = await handlers.list_servers({}, client);
  assert.equal(result.isError, true);
  const data = JSON.parse(result.content[0].text);
  assert.equal(data.error_code, 'PROJECT_NOT_FOUND');
});