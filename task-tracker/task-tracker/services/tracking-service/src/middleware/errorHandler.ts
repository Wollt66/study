import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, fail, createLogger } from '@task-tracker/shared';

const logger = createLogger('tracking-service', process.env.LOG_LEVEL || 'info');

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn({ code: err.code }, '业务错误');
    res.status(err.httpStatus).json(fail(err.code, err.message));
    return;
  }
  logger.error({ err: err.message }, '未预期错误');
  res.status(500).json(fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误'));
}
