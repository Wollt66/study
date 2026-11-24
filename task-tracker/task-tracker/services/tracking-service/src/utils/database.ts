import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;
  const dbPath = process.env.DB_PATH || './data/tracking.sqlite';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS completions (
      event_id     TEXT PRIMARY KEY,
      task_id      TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_completions_user_task ON completions(user_id, task_id, completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_completions_user_time ON completions(user_id, completed_at DESC);

    CREATE TABLE IF NOT EXISTS status_logs (
      log_id      TEXT PRIMARY KEY,
      task_id     TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status   TEXT NOT NULL,
      changed_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_status_logs_user_task ON status_logs(user_id, task_id, changed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_status_logs_user_time ON status_logs(user_id, changed_at DESC);
  `);
}
