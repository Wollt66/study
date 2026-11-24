import { Request, Response } from 'express';
import { ok } from '@task-tracker/shared';
import { ReportService } from '../services/reportService';

export class ReportController {
  constructor(private reportService: ReportService = new ReportService()) {}

  summary = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const { startDate, endDate } = req.query as Record<string, string>;
    const result = await this.reportService.summary(userId, startDate, endDate);
    res.json(ok(result));
  };

  daily = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const { startDate, endDate } = req.query as Record<string, string>;
    res.json(ok(await this.reportService.daily(userId, startDate, endDate)));
  };

  weekly = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const { startDate, endDate } = req.query as Record<string, string>;
    res.json(ok(await this.reportService.weekly(userId, startDate, endDate)));
  };

  monthly = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const { startDate, endDate } = req.query as Record<string, string>;
    res.json(ok(await this.reportService.monthly(userId, startDate, endDate)));
  };

  trend = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as Request & { user: { userId: string } }).user.userId;
    const { startDate, endDate, period } = req.query as Record<string, string>;
    res.json(ok(await this.reportService.trend(userId, startDate, endDate, period as 'daily' | 'weekly' | 'monthly')));
  };

  health = (_req: Request, res: Response): void => {
    res.json({ status: 'ok', service: 'report-service', uptime: process.uptime() });
  };
}
