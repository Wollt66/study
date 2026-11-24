export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MissingConfigError extends Error {
  constructor(missing) {
    super(`缺少配置：${missing.join('、')}`);
    this.name = 'MissingConfigError';
    this.missing = missing;
  }
}

function textPayload(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

export function invalidArguments(detail) {
  return { ...textPayload({ error_code: 'INVALID_ARGUMENTS', error_msg: `参数非法：${detail}` }), isError: true };
}

export function missingConfig(names) {
  return { ...textPayload({ error_code: 'MISSING_CONFIG', error_msg: `缺少配置：请设置环境变量 ${names.join('、')}` }), isError: true };
}

export function networkError(detail) {
  return { ...textPayload({ error_code: 'NETWORK_ERROR', error_msg: `网络异常：${detail}` }), isError: true };
}

export function apiError({ error_code, error_msg, http_status }) {
  return {
    ...textPayload({
      error_code: error_code || 'UNKNOWN_API_ERROR',
      error_msg: error_msg || '华为云接口返回错误',
      http_status,
    }),
    isError: true,
  };
}