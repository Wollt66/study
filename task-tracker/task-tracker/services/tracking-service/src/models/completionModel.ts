import Database from 'better-sqlite3';
import { CompletionRow } from '../types';
import { getDatabase } from '../utils/database';
import { DecodedCursor, PaginatedResponse, buildPaginatedResponse } from '@task-tracker/shared';

export class CompletionRepository {
  private db: Database.Database;
  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase();
  }

  create(row: CompletionRow): CompletionRow {
    this.db.prepare(`INSERT INTO completions (event_id, task_id, user_id, completed_at) VALUES (?, ?, ?, ?)`)
      .run(row.event_id, row.task_id, row.user_id, row.completed_at);
    return row;
  }

  listByUser(userId: string, taskId: string | undefined, cursor: DecodedCursor | undefined, limit: number): PaginatedResponse<CompletionRow> {
    const conditions: string[] = ['user_id = @userId'];
    const params: Record<string, unknown> = { userId, limit: limit + 1 };
    if (taskId) { conditions.push('task_id = @taskId'); params.taskId = taskId; }
    if (cursor) { conditions.push('completed_at < @cursorValue'); params.cursorValue = cursor.sortValue; }
    const rows = this.db.prepare(`
      SELECT * FROM completions WHERE ${conditions.join(' AND ')}
      ORDER BY completed_at DESC LIMIT @limit
    `).all(params) as CompletionRow[];
    return buildPaginatedResponse(rows, limit, 'completed_at');
  }

  countByUser(userId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM completions WHERE user_id = ?').get(userId) as { cnt: number };
    return row.cnt;
  }

  listByUserAndTimeRange(userId: string, startDate: string, endDate: string): CompletionRow[] {
    return this.db.prepare(`
      SELECT * FROM completions WHERE user_id = ? AND completed_at >= ? AND completed_at <= ?
      ORDER BY completed_at ASC
    `).all(userId, startDate, endDate) as CompletionRow[];
  }
}
