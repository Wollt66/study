import { AppError, ErrorCode } from './errorCodes';

export interface HttpClientOptions {
  timeoutMs?: number;
  retries?: number;
  internalToken?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * 基于原生 fetch + AbortController 的 HTTP 客户端
 * - 超时控制（默认 3000ms）
 * - 网络错误重试（默认 1 次）
 * - 自动注入 X-Internal-Token
 * - 业务错误码不重试，网络错误抛 5031
 */
export class HttpClient {
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly internalToken?: string;

  constructor(opts: HttpClientOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? 3000;
    this.retries = opts.retries ?? 1;
    this.internalToken = opts.internalToken;
  }

  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    };
    if (this.internalToken) {
      headers['X-Internal-Token'] = this.internalToken;
    }

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          // 业务错误：尝试解析错误码，不重试
          const text = await res.text();
          let code = ErrorCode.SERVICE_UNAVAILABLE;
          let message = `下游服务返回 ${res.status}`;
          try {
            const parsed = JSON.parse(text);
            if (typeof parsed.code === 'number') code = parsed.code;
            if (typeof parsed.message === 'string') message = parsed.message;
          } catch {
            /* ignore parse error */
          }
          throw new AppError(code, message, res.status);
        }

        const text = await res.text();
        return (text ? JSON.parse(text) : ({} as T)) as T;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        // AppError 是业务错误，不重试
        if (err instanceof AppError) throw err;
        // 网络错误（超时/连接失败）：重试
        if (attempt < this.retries) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }
    }
    throw new AppError(
      ErrorCode.SERVICE_UNAVAILABLE,
      `下游服务不可用: ${lastError instanceof Error ? lastError.message : 'unknown'}`,
    );
  }
}
