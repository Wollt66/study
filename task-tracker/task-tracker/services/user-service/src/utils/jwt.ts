import jwt from 'jsonwebtoken';
import { JwtPayload } from '@task-tracker/shared';

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 环境变量未配置');
  return secret;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign({ userId: payload.userId, username: payload.username }, getSecret(), {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
