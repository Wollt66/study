import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, JwtPayload } from '@task-tracker/shared';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request { user?: JwtPayload; }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(ErrorCode.UNAUTHORIZED, '登录已失效，请重新登录');
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as JwtPayload;
    next();
  } catch {
    throw new AppError(ErrorCode.UNAUTHORIZED, '登录已失效，请重新登录');
  }
}

export function authenticateInternal(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_TOKEN;
  if (!expected || token !== expected) {
    throw new AppError(ErrorCode.INTERNAL_UNAUTHORIZED, '内部调用未授权');
  }
  next();
}
