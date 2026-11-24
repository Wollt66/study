import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;
  const dbPath = process.env.DB_PATH || './data/task.sqlite';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id      TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      title        TEXT NOT NULL,
      description  TEXT,
      category     TEXT,
      priority     TEXT NOT NULL DEFAULT 'medium',
      status       TEXT NOT NULL DEFAULT 'TODO',
      due_date     TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category);

    CREATE TABLE IF NOT EXISTS outbox (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type    TEXT NOT NULL,
      payload       TEXT NOT NULL,
      target_url    TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'PENDING',
      retries       INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      next_retry_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status, next_retry_at);
  `);
}
