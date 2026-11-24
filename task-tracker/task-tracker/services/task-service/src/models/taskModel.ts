import Database from 'better-sqlite3';
import { TaskRow, TaskFilters } from '../types';
import { getDatabase } from '../utils/database';
import { DecodedCursor, PaginatedResponse, buildPaginatedResponse } from '@task-tracker/shared';

export class TaskRepository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase();
  }

  create(row: TaskRow): TaskRow {
    this.db.prepare(`
      INSERT INTO tasks (task_id, user_id, title, description, category, priority, status, due_date, created_at, updated_at)
      VALUES (@task_id, @user_id, @title, @description, @category, @priority, @status, @due_date, @created_at, @updated_at)
    `).run(row);
    return row;
  }

  findById(taskId: string): TaskRow | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as TaskRow | undefined;
    return row ?? null;
  }

  update(taskId: string, fields: Partial<TaskRow>): TaskRow | null {
    const sets: string[] = [];
    const params: Record<string, unknown> = { task_id: taskId };
    for (const [key, value] of Object.entries(fields)) {
      sets.push(`${key} = @${key}`);
      params[key] = value;
    }
    if (sets.length === 0) return this.findById(taskId);
    this.db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE task_id = @task_id`).run(params);
    return this.findById(taskId);
  }

  delete(taskId: string): boolean {
    const result = this.db.prepare('DELETE FROM tasks WHERE task_id = ?').run(taskId);
    return result.changes > 0;
  }

  listByUser(
    userId: string,
    filters: TaskFilters,
    cursor: DecodedCursor | undefined,
    limit: number,
  ): PaginatedResponse<TaskRow> {
    const conditions: string[] = ['user_id = @userId'];
    const params: Record<string, unknown> = { userId, limit: limit + 1 };

    if (filters.category) {
      conditions.push('category = @category');
      params.category = filters.category;
    }
    if (filters.priority) {
      conditions.push('priority = @priority');
      params.priority = filters.priority;
    }
    if (filters.status) {
      conditions.push('status = @status');
      params.status = filters.status;
    }
    if (cursor) {
      conditions.push('created_at < @cursorValue');
      params.cursorValue = cursor.sortValue;
    }

    const rows = this.db.prepare(`
      SELECT * FROM tasks
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT @limit
    `).all(params) as TaskRow[];

    return buildPaginatedResponse(rows, limit, 'created_at');
  }

  countByStatus(userId: string): { todo: number; inProgress: number; done: number } {
    const rows = this.db.prepare(`
      SELECT status, COUNT(*) as cnt FROM tasks WHERE user_id = ? GROUP BY status
    `).all(userId) as Array<{ status: string; cnt: number }>;
    const result = { todo: 0, inProgress: 0, done: 0 };
    for (const row of rows) {
      if (row.status === 'TODO') result.todo = row.cnt;
      else if (row.status === 'IN_PROGRESS') result.inProgress = row.cnt;
      else if (row.status === 'DONE') result.done = row.cnt;
    }
    return result;
  }
}
