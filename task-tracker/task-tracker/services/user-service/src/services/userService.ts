import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ErrorCode, JwtPayload } from '@task-tracker/shared';
import { UserRepository } from '../models/userModel';
import { RegisterRequest, LoginRequest, UpdateProfileRequest, UserProfile } from '../types';
import { signToken } from '../utils/jwt';

export class UserService {
  constructor(private repo: UserRepository = new UserRepository()) {}

  async register(body: RegisterRequest): Promise<{ userId: string }> {
    // 密码复杂度
    if (body.password.length < 8 || !/[a-zA-Z]/.test(body.password) || !/\d/.test(body.password)) {
      throw new AppError(ErrorCode.BAD_REQUEST, '密码长度需≥8且包含字母与数字');
    }
    // 唯一性
    if (this.repo.findByUsername(body.username)) {
      throw new AppError(ErrorCode.USER_DUPLICATE, '用户名已存在');
    }
    if (this.repo.findByEmail(body.email)) {
      throw new AppError(ErrorCode.USER_DUPLICATE, '邮箱已存在');
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const now = new Date().toISOString();
    const userId = uuidv4();
    this.repo.create({
      user_id: userId,
      username: body.username,
      email: body.email,
      password_hash: passwordHash,
      nickname: null,
      created_at: now,
      updated_at: now,
    });
    return { userId };
  }

  async login(body: LoginRequest): Promise<{ token: string; expiresIn: number }> {
    const user = this.repo.findByAccount(body.account);
    if (!user) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '用户名或密码错误');
    }
    const match = await bcrypt.compare(body.password, user.password_hash);
    if (!match) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, '用户名或密码错误');
    }
    const payload: JwtPayload = { userId: user.user_id, username: user.username };
    const token = signToken(payload);
    return { token, expiresIn: 604800 };
  }

  getProfile(userId: string): UserProfile {
    const user = this.repo.findById(userId);
    if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, '用户不存在');
    return this.toProfile(user);
  }

  updateProfile(userId: string, body: UpdateProfileRequest): UserProfile {
    if (body.password !== undefined) {
      throw new AppError(ErrorCode.FORBIDDEN, '不允许通过此接口修改密码');
    }
    if (body.email !== undefined) {
      const existing = this.repo.findByEmail(body.email);
      if (existing && existing.user_id !== userId) {
        throw new AppError(ErrorCode.EMAIL_DUPLICATE, '邮箱已被占用');
      }
    }
    const updated = this.repo.updateProfile(userId, {
      email: body.email,
      nickname: body.nickname,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) throw new AppError(ErrorCode.USER_NOT_FOUND, '用户不存在');
    return this.toProfile(updated);
  }

  private toProfile(row: {
    user_id: string;
    username: string;
    email: string;
    nickname: string | null;
    created_at: string;
  }): UserProfile {
    return {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      nickname: row.nickname,
      createdAt: row.created_at,
    };
  }
}
