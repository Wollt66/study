import pino from 'pino';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function createLogger(serviceName: string, level: string = 'info') {
  return pino({
    level,
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/**
 * Express 中间件：为每个请求生成 requestId 并注入日志
 */
export function requestIdMiddleware(logger: pino.Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    logger.info({ requestId, method: req.method, url: req.url }, 'incoming request');
    next();
  };
}
