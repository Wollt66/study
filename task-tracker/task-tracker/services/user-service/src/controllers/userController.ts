import { Request, Response } from 'express';
import { ok } from '@task-tracker/shared';
import { UserService } from '../services/userService';

export class UserController {
  constructor(private userService: UserService = new UserService()) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.userService.register(req.body);
    res.json(ok(result, '注册成功'));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.userService.login(req.body);
    res.json(ok(result, '登录成功'));
  };

  getProfile = (req: Request, res: Response): void => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const profile = this.userService.getProfile(userId);
    res.json(ok(profile));
  };

  updateProfile = (req: Request, res: Response): void => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const profile = this.userService.updateProfile(userId, req.body);
    res.json(ok(profile, '更新成功'));
  };

  health = (_req: Request, res: Response): void => {
    res.json({ status: 'ok', service: 'user-service', uptime: process.uptime() });
  };
}
