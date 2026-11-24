import { TrackingClient } from '../clients/trackingClient';
import { TaskClient } from '../clients/taskClient';
import { SummaryResult, DailyReport } from '../types';
import { aggregateDaily, aggregateWeekly, aggregateMonthly, calcRate } from './aggregator';

export class ReportService {
  constructor(
    private trackingClient = new TrackingClient(),
    private taskClient = new TaskClient(),
  ) {}

  async summary(userId: string, startDate: string, endDate: string): Promise<SummaryResult> {
    const [completions, counts] = await Promise.all([
      this.trackingClient.getCompletionsByTimeRange(userId, startDate, endDate),
      this.taskClient.getTaskCountByStatus(userId),
    ]);
    const totalTasks = counts.todo + counts.inProgress + counts.done;
    return {
      totalCompleted: completions.length,
      totalTasks,
      completionRate: calcRate(counts.done, totalTasks),
    };
  }

  async daily(userId: string, startDate: string, endDate: string): Promise<DailyReport[]> {
    const completions = await this.trackingClient.getCompletionsByTimeRange(userId, startDate, endDate);
    return aggregateDaily(completions);
  }

  async weekly(userId: string, startDate: string, endDate: string) {
    const completions = await this.trackingClient.getCompletionsByTimeRange(userId, startDate, endDate);
    return aggregateWeekly(completions);
  }

  async monthly(userId: string, startDate: string, endDate: string) {
    const completions = await this.trackingClient.getCompletionsByTimeRange(userId, startDate, endDate);
    return aggregateMonthly(completions);
  }

  async trend(userId: string, startDate: string, endDate: string, period: 'daily' | 'weekly' | 'monthly') {
    const completions = await this.trackingClient.getCompletionsByTimeRange(userId, startDate, endDate);
    const counts = await this.taskClient.getTaskCountByStatus(userId);
    const total = counts.todo + counts.inProgress + counts.done;
    let buckets: Array<{ period: string; completedCount: number }>;
    if (period === 'daily') buckets = aggregateDaily(completions).map((d) => ({ period: d.date, completedCount: d.completedCount }));
    else if (period === 'weekly') buckets = aggregateWeekly(completions).map((w) => ({ period: w.week, completedCount: w.completedCount }));
    else buckets = aggregateMonthly(completions).map((m) => ({ period: m.month, completedCount: m.completedCount }));
    return buckets.map((b) => ({ period: b.period, completionRate: calcRate(b.completedCount, total) }));
  }
}
