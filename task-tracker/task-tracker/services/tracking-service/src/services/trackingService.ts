import { v4 as uuidv4 } from 'uuid';
import { PaginatedResponse, DecodedCursor } from '@task-tracker/shared';
import { CompletionRepository } from '../models/completionModel';
import { StatusLogRepository } from '../models/statusLogModel';
import { TaskClient } from '../clients/taskClient';
import { ProgressResult } from '../types';

export class TrackingService {
  constructor(
    private completionRepo = new CompletionRepository(),
    private statusLogRepo = new StatusLogRepository(),
    private taskClient = new TaskClient(),
  ) {}

  recordCompletion(payload: { taskId: string; userId: string; completedAt?: string }): { eventId: string } {
    const eventId = uuidv4();
    this.completionRepo.create({
      event_id: eventId,
      task_id: payload.taskId,
      user_id: payload.userId,
      completed_at: payload.completedAt || new Date().toISOString(),
    });
    return { eventId };
  }

  listCompletions(userId: string, query: { taskId?: string; cursor?: DecodedCursor; limit: number }): PaginatedResponse<unknown> {
    return this.completionRepo.listByUser(userId, query.taskId, query.cursor, query.limit);
  }

  async getProgress(userId: string): Promise<ProgressResult> {
    const counts = await this.taskClient.countByStatus(userId);
    const total = counts.todo + counts.inProgress + counts.done;
    const completionRate = total === 0 ? 0 : Math.round((counts.done / total) * 10000) / 10000;
    return {
      completed: counts.done,
      inProgress: counts.inProgress,
      todo: counts.todo,
      completionRate,
    };
  }

  recordStatusLog(payload: { taskId: string; userId: string; fromStatus: string; toStatus: string; changedAt?: string }): { logId: string } {
    const logId = uuidv4();
    this.statusLogRepo.create({
      log_id: logId,
      task_id: payload.taskId,
      user_id: payload.userId,
      from_status: payload.fromStatus,
      to_status: payload.toStatus,
      changed_at: payload.changedAt || new Date().toISOString(),
    });
    return { logId };
  }

  listStatusLogs(userId: string, query: { taskId?: string; cursor?: DecodedCursor; limit: number }): PaginatedResponse<unknown> {
    return this.statusLogRepo.listByUser(userId, query.taskId, query.cursor, query.limit);
  }

  listCompletionsByTimeRange(userId: string, startDate: string, endDate: string) {
    return this.completionRepo.listByUserAndTimeRange(userId, startDate, endDate);
  }
}
