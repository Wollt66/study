import { v4 as uuidv4 } from 'uuid';
import { AppError, ErrorCode, Priority, TaskStatus, PaginatedResponse, DecodedCursor } from '@task-tracker/shared';
import { TaskRepository } from '../models/taskModel';
import { OutboxRepository } from '../models/outboxModel';
import { TrackingClient } from '../clients/trackingClient';
import { isValidTransition } from './statusMachine';
import { CreateTaskBody, UpdateTaskBody, TaskFilters, Task } from '../types';

export class TaskService {
  constructor(
    private taskRepo: TaskRepository = new TaskRepository(),
    private outboxRepo: OutboxRepository = new OutboxRepository(),
    private trackingClient: TrackingClient = new TrackingClient(),
  ) {}

  async create(userId: string, body: CreateTaskBody): Promise<{ taskId: string }> {
    if (!body.title || body.title.length > 100) {
      throw new AppError(ErrorCode.BAD_REQUEST, '标题非空且长度≤100');
    }
    if (body.priority && !Object.values(Priority).includes(body.priority)) {
      throw new AppError(ErrorCode.BAD_REQUEST, '优先级取值非法');
    }
    if (body.dueDate && new Date(body.dueDate) <= new Date()) {
      throw new AppError(ErrorCode.BAD_REQUEST, '截止日期必须晚于当前时间');
    }
    const now = new Date().toISOString();
    const taskId = uuidv4();
    this.taskRepo.create({
      task_id: taskId,
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
      category: body.category ?? null,
      priority: body.priority ?? Priority.Medium,
      status: TaskStatus.Todo,
      due_date: body.dueDate ?? null,
      created_at: now,
      updated_at: now,
    });
    return { taskId };
  }

  async update(userId: string, taskId: string, body: UpdateTaskBody): Promise<Task> {
    const task = this.assertOwner(userId, taskId);
    const fields: Partial<{ title: string; description: string | null; category: string | null; priority: string; due_date: string | null; updated_at: string }> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) fields.title = body.title;
    if (body.description !== undefined) fields.description = body.description;
    if (body.category !== undefined) fields.category = body.category;
    if (body.priority !== undefined) fields.priority = body.priority;
    if (body.dueDate !== undefined) fields.due_date = body.dueDate;
    const updated = this.taskRepo.update(taskId, fields);
    return this.toTask(updated!);
  }

  async remove(userId: string, taskId: string): Promise<void> {
    this.assertOwner(userId, taskId);
    this.taskRepo.delete(taskId);
  }

  get(userId: string, taskId: string): Task {
    const task = this.assertOwner(userId, taskId);
    return this.toTask(task);
  }

  list(userId: string, filters: TaskFilters, cursor: DecodedCursor | undefined, limit: number): PaginatedResponse<Task> {
    const result = this.taskRepo.listByUser(userId, filters, cursor, limit);
    return {
      items: result.items.map((r) => this.toTask(r)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  async updateStatus(userId: string, taskId: string, newStatus: TaskStatus): Promise<Task> {
    const task = this.assertOwner(userId, taskId);
    const fromStatus = task.status as TaskStatus;
    if (!isValidTransition(fromStatus, newStatus)) {
      throw new AppError(ErrorCode.INVALID_STATUS_TRANSITION, '不允许的状态流转');
    }
    const now = new Date().toISOString();
    const updated = this.taskRepo.update(taskId, { status: newStatus, updated_at: now });

    // 异步通知 tracking-service，失败写 outbox 补偿
    const trackingUrl = process.env.TRACKING_SERVICE_URL || 'http://localhost:3003/api';
    try {
      if (newStatus === TaskStatus.Done) {
        await this.trackingClient.recordCompletion({ taskId, userId, completedAt: now });
      }
      await this.trackingClient.recordStatusLog({
        taskId,
        userId,
        fromStatus,
        toStatus: newStatus,
        changedAt: now,
      });
    } catch {
      // 主流程不阻塞，写 outbox 由后台重试
      if (newStatus === TaskStatus.Done) {
        this.outboxRepo.create('COMPLETION', { taskId, userId, completedAt: now }, `${trackingUrl}/tracking/completions`);
      }
      this.outboxRepo.create('STATUS_LOG', { taskId, userId, fromStatus, toStatus: newStatus, changedAt: now }, `${trackingUrl}/tracking/status-logs`);
    }

    return this.toTask(updated!);
  }

  countByStatus(userId: string): { todo: number; inProgress: number; done: number } {
    return this.taskRepo.countByStatus(userId);
  }

  private assertOwner(userId: string, taskId: string) {
    const task = this.taskRepo.findById(taskId);
    if (!task || task.user_id !== userId) {
      throw new AppError(ErrorCode.TASK_NOT_FOUND, '任务不存在');
    }
    return task;
  }

  private toTask(row: {
    task_id: string;
    user_id: string;
    title: string;
    description: string | null;
    category: string | null;
    priority: string;
    status: string;
    due_date: string | null;
    created_at: string;
    updated_at: string;
  }): Task {
    return {
      taskId: row.task_id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority as Priority,
      status: row.status as TaskStatus,
      dueDate: row.due_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
