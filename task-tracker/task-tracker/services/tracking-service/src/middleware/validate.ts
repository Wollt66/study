import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError, ErrorCode } from '@task-tracker/shared';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join('; ');
      throw new AppError(ErrorCode.BAD_REQUEST, messages);
    }
    if (source === 'body') req.body = result.data;
    next();
  };
}
