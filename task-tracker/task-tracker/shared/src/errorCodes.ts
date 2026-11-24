// ===== 错误码常量 =====
export const ErrorCode = {
  OK: 0,
  BAD_REQUEST: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  INTERNAL_UNAUTHORIZED: 1004,
  USER_NOT_FOUND: 2001,
  INVALID_CREDENTIALS: 2002,
  USER_DUPLICATE: 2003,
  EMAIL_DUPLICATE: 2004,
  TASK_NOT_FOUND: 3001,
  INVALID_STATUS_TRANSITION: 4001,
  INTERNAL_ERROR: 5001,
  SERVICE_UNAVAILABLE: 5031,
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ===== AppError 业务异常 =====
export class AppError extends Error {
  public readonly code: number;
  public readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus ?? toHttpStatusCode(code);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ===== 错误码 → HTTP 状态码映射 =====
export function toHttpStatusCode(code: number): number {
  switch (code) {
    case ErrorCode.OK:
      return 200;
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.INVALID_STATUS_TRANSITION:
      return 400;
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.INTERNAL_UNAUTHORIZED:
    case ErrorCode.INVALID_CREDENTIALS:
      return 401;
    case ErrorCode.FORBIDDEN:
      return 403;
    case ErrorCode.USER_NOT_FOUND:
    case ErrorCode.TASK_NOT_FOUND:
      return 404;
    case ErrorCode.USER_DUPLICATE:
    case ErrorCode.EMAIL_DUPLICATE:
      return 409;
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503;
    case ErrorCode.INTERNAL_ERROR:
    default:
      return 500;
  }
}
