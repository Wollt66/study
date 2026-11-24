import { createHash, createHmac } from 'node:crypto';
import { MissingConfigError } from './errors.mjs';

export class HuaweiApiError extends Error {
  constructor(payload, httpStatus) {
    super(payload?.error_msg || '华为云接口返回错误');
    this.name = 'HuaweiApiError';
    this.payload = payload || {};
    this.httpStatus = httpStatus;
  }
}

export class HuaweiNetworkError extends Error {
  constructor(cause) {
    super(cause?.message || String(cause));
    this.name = 'HuaweiNetworkError';
    this.cause = cause;
  }
}

export function rfc3986Encode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function formatSdkDate(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
}

export function buildCanonicalQuery(params = {}) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
    .map(([k, v]) => `${rfc3986Encode(k)}=${rfc3986Encode(v)}`)
    .sort()
    .join('&');
}

export function buildCanonicalRequest({ method, path, query = '', headers = {}, body = '' }) {
  const canonicalUri = path.endsWith('/') ? path : `${path}/`;
  const names = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const canonicalHeaders = names.map((h) => `${h}:${String(headers[h]).trim()}\n`).join('');
  const signedHeaders = names.join(';');
  const payloadHash = createHash('sha256').update(body).digest('hex');
  return `${method}\n${canonicalUri}\n${query}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
}

export function buildAuthorization({ method, path, query, headers, body, ak, sk, timestamp }) {
  const canonicalRequest = buildCanonicalRequest({ method, path, query, headers, body });
  const hashedRequest = createHash('sha256').update(canonicalRequest).digest('hex');
  const stringToSign = `SDK-HMAC-SHA256\n${timestamp}\n${hashedRequest}`;
  const signature = createHmac('sha256', sk).update(stringToSign).digest('hex');
  const signedHeaders = Object.keys(headers).map((h) => h.toLowerCase()).sort().join(';');
  return `SDK-HMAC-SHA256 Access=${ak}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

const SERVICE_ENDPOINTS = {
  ecs: (region) => `ecs.${region}.myhuaweicloud.com`,
  iam: () => 'iam.myhuaweicloud.com',
};

export class HuaweiCloudClient {
  constructor(options = {}) {
    this.ak = options.ak;
    this.sk = options.sk;
    this.region = options.region || 'cn-north-4';
    this.projectId = options.projectId;
    this.fetchImpl = options.fetchImpl || ((...args) => globalThis.fetch(...args));
    this.clock = options.clock || (() => new Date());
    this.timeoutMs = options.timeoutMs || 10000;
    this.cachedProjectId = null;
  }

  ensureCredentials() {
    const missing = [];
    if (!this.ak) missing.push('HUAWEI_AK');
    if (!this.sk) missing.push('HUAWEI_SK');
    if (missing.length) throw new MissingConfigError(missing);
  }

  async requireProjectId() {
    if (this.projectId) return this.projectId;
    if (this.cachedProjectId) return this.cachedProjectId;
    const data = await this.request('GET', '/v3/projects', { service: 'iam' });
    const hit = (data.projects || []).find((p) => p.name === this.region);
    if (!hit) {
      throw new HuaweiApiError(
        {
          error_code: 'PROJECT_NOT_FOUND',
          error_msg: `区域 ${this.region} 下未找到 IAM 项目，请检查 HUAWEI_REGION 或显式配置 HUAWEI_PROJECT_ID`,
        },
        404
      );
    }
    this.cachedProjectId = hit.id;
    return this.cachedProjectId;
  }

  async request(method, path, { service = 'ecs', query, body } = {}) {
    this.ensureCredentials();
    const host = SERVICE_ENDPOINTS[service](this.region);
    const canonicalQuery = buildCanonicalQuery(query);
    const bodyText = body === undefined ? '' : JSON.stringify(body);
    const timestamp = formatSdkDate(this.clock());
    const signedHeaders = { host, 'x-sdk-date': timestamp };
    const authorization = buildAuthorization({
      method,
      path,
      query: canonicalQuery,
      headers: signedHeaders,
      body: bodyText,
      ak: this.ak,
      sk: this.sk,
      timestamp,
    });
    const headers = {
      'content-type': 'application/json',
      host,
      'x-sdk-date': timestamp,
      authorization,
    };
    const url = `https://${host}${path}${canonicalQuery ? `?${canonicalQuery}` : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(url, { method, headers, body: bodyText || undefined, signal: controller.signal });
    } catch (cause) {
      throw new HuaweiNetworkError(cause);
    } finally {
      clearTimeout(timer);
    }
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (!response.ok) {
      throw new HuaweiApiError(
        {
          error_code: data.error_code || data.code || `HTTP_${response.status}`,
          error_msg: data.error_msg || data.message || (text ? text.slice(0, 200) : `HTTP ${response.status}`),
        },
        response.status
      );
    }
    return data;
  }
}