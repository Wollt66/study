import Database from 'better-sqlite3';
import { StatusLogRow } from '../types';
import { getDatabase } from '../utils/database';
import { DecodedCursor, PaginatedResponse, buildPaginatedResponse } from '@task-tracker/shared';

export class StatusLogRepository {
  private db: Database.Database;
  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase();
  }

  create(row: StatusLogRow): StatusLogRow {
    this.db.prepare(`INSERT INTO status_logs (log_id, task_id, user_id, from_status, to_status, changed_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(row.log_id, row.task_id, row.user_id, row.from_status, row.to_status, row.changed_at);
    return row;
  }

  listByUser(userId: string, taskId: string | undefined, cursor: DecodedCursor | undefined, limit: number): PaginatedResponse<StatusLogRow> {
    const conditions: string[] = ['user_id = @userId'];
    const params: Record<string, unknown> = { userId, limit: limit + 1 };
    if (taskId) { conditions.push('task_id = @taskId'); params.taskId = taskId; }
    if (cursor) { conditions.push('changed_at < @cursorValue'); params.cursorValue = cursor.sortValue; }
    const rows = this.db.prepare(`
      SELECT * FROM status_logs WHERE ${conditions.join(' AND ')}
      ORDER BY changed_at DESC LIMIT @limit
    `).all(params) as StatusLogRow[];
    return buildPaginatedResponse(rows, limit, 'changed_at');
  }
}
