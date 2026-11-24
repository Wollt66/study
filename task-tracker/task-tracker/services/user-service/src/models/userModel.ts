import Database from 'better-sqlite3';
import { UserRow } from '../types';
import { getDatabase } from '../utils/database';

export class UserRepository {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getDatabase();
  }

  create(user: UserRow): UserRow {
    const stmt = this.db.prepare(`
      INSERT INTO users (user_id, username, email, password_hash, nickname, created_at, updated_at)
      VALUES (@user_id, @username, @email, @password_hash, @nickname, @created_at, @updated_at)
    `);
    stmt.run(user);
    return user;
  }

  findById(userId: string): UserRow | null {
    const row = this.db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) as UserRow | undefined;
    return row ?? null;
  }

  findByUsername(username: string): UserRow | null {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
    return row ?? null;
  }

  findByEmail(email: string): UserRow | null {
    const row = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
    return row ?? null;
  }

  findByAccount(account: string): UserRow | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(account, account) as UserRow | undefined;
    return row ?? null;
  }

  updateProfile(userId: string, fields: { email?: string; nickname?: string; updatedAt: string }): UserRow | null {
    const sets: string[] = [];
    const params: Record<string, unknown> = { user_id: userId, updated_at: fields.updatedAt };
    if (fields.email !== undefined) {
      sets.push('email = @email');
      params.email = fields.email;
    }
    if (fields.nickname !== undefined) {
      sets.push('nickname = @nickname');
      params.nickname = fields.nickname;
    }
    if (sets.length === 0) return this.findById(userId);
    sets.push('updated_at = @updated_at');
    this.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE user_id = @user_id`).run(params);
    return this.findById(userId);
  }
}
