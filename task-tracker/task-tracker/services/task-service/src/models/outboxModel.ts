import Database from 'better-sqlite3';
import { OutboxRow } from '../types';
import { getDatabase } from '../utils/database';

export class OutboxRepository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase();
  }

  create(eventType: string, payload: object, targetUrl: string): OutboxRow {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO outbox (event_type, payload, target_url, status, retries, created_at, next_retry_at)
      VALUES (?, ?, ?, 'PENDING', 0, ?, ?)
    `);
    const info = stmt.run(eventType, JSON.stringify(payload), targetUrl, now, now);
    return {
      id: Number(info.lastInsertRowid),
      event_type: eventType,
      payload: JSON.stringify(payload),
      target_url: targetUrl,
      status: 'PENDING',
      retries: 0,
      created_at: now,
      next_retry_at: now,
    };
  }

  markSent(id: number): void {
    this.db.prepare("UPDATE outbox SET status = 'SENT' WHERE id = ?").run(id);
  }

  markFailed(id: number): void {
    this.db.prepare("UPDATE outbox SET status = 'FAILED' WHERE id = ?").run(id);
  }

  incrementRetry(id: number, nextRetryAt: string): void {
    this.db.prepare('UPDATE outbox SET retries = retries + 1, next_retry_at = ? WHERE id = ?').run(nextRetryAt, id);
  }

  findPending(limit: number): OutboxRow[] {
    return this.db.prepare(`
      SELECT * FROM outbox
      WHERE status IN ('PENDING', 'FAILED') AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY id ASC LIMIT ?
    `).run(new Date().toISOString(), limit) as OutboxRow[];
  }
}
