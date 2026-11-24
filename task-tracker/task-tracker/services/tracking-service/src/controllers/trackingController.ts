import { Request, Response } from 'express';
import { ok, decodeCursor, AppError, ErrorCode } from '@task-tracker/shared';
import { TrackingService } from '../services/trackingService';

export class TrackingController {
  constructor(private trackingService: TrackingService = new TrackingService()) {}

  recordCompletion = (req: Request, res: Response): void => {
    const result = this.trackingService.recordCompletion(req.body);
    res.json(ok(result, '完成事件已记录'));
  };

  listCompletions = (req: Request, res: Response): void => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const q = req.query as Record<string, string>;
    const cursor = q.cursor ? decodeCursor(q.cursor) : undefined;
    const result = this.trackingService.listCompletions(userId, {
      taskId: q.taskId,
      cursor,
      limit: parseInt(q.limit || '20', 10),
    });
    res.json(ok(result));
  };

  getProgress = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const result = await this.trackingService.getProgress(userId);
    res.json(ok(result));
  };

  recordStatusLog = (req: Request, res: Response): void => {
    const result = this.trackingService.recordStatusLog(req.body);
    res.json(ok(result, '状态日志已记录'));
  };

  listStatusLogs = (req: Request, res: Response): void => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const q = req.query as Record<string, string>;
    const cursor = q.cursor ? decodeCursor(q.cursor) : undefined;
    const result = this.trackingService.listStatusLogs(userId, {
      taskId: q.taskId,
      cursor,
      limit: parseInt(q.limit || '20', 10),
    });
    res.json(ok(result));
  };

  internalCompletions = (req: Request, res: Response): void => {
    const userId = req.query.userId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!userId || !startDate || !endDate) {
      throw new AppError(ErrorCode.BAD_REQUEST, '缺少 userId/startDate/endDate');
    }
    const result = this.trackingService.listCompletionsByTimeRange(userId, startDate, endDate);
    res.json(ok(result));
  };

  health = (_req: Request, res: Response): void => {
    res.json({ status: 'ok', service: 'tracking-service', uptime: process.uptime() });
  };
}
