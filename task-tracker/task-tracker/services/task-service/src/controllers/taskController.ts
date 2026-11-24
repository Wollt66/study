import { Request, Response } from 'express';
import { ok, decodeCursor, AppError, ErrorCode, Priority, TaskStatus } from '@task-tracker/shared';
import { TaskService } from '../services/taskService';

export class TaskController {
  constructor(private taskService: TaskService = new TaskService()) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const result = await this.taskService.create(userId, req.body);
    res.json(ok(result, '任务创建成功'));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const task = await this.taskService.update(userId, req.params.id, req.body);
    res.json(ok(task, '更新成功'));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    await this.taskService.remove(userId, req.params.id);
    res.json(ok(null, '删除成功'));
  };

  get = (req: Request, res: Response): void => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const task = this.taskService.get(userId, req.params.id);
    res.json(ok(task));
  };

  list = (req: Request, res: Response): void => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const q = req.query as Record<string, string>;
    const cursor = q.cursor ? decodeCursor(q.cursor) : undefined;
    const result = this.taskService.list(
      userId,
      {
        category: q.category,
        priority: q.priority as Priority | undefined,
        status: q.status as TaskStatus | undefined,
      },
      cursor,
      parseInt(q.limit || '20', 10),
    );
    res.json(ok(result));
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const task = await this.taskService.updateStatus(userId, req.params.id, req.body.status as TaskStatus);
    res.json(ok(task, '状态更新成功'));
  };

  countByStatus = (req: Request, res: Response): void => {
    const userId = (req.query.userId as string) || (req as Request & { user?: { userId: string } }).user?.userId;
    if (!userId) throw new AppError(ErrorCode.BAD_REQUEST, '缺少 userId');
    const result = this.taskService.countByStatus(userId);
    res.json(ok(result));
  };

  health = (_req: Request, res: Response): void => {
    res.json({ status: 'ok', service: 'task-service', uptime: process.uptime() });
  };
}
