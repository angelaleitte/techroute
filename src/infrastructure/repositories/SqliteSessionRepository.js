export class SqliteSessionRepository {
  constructor(db) {
    this.db = db;
  }

  create({ token, userId, expiresAt, createdAt }) {
    this.db
      .prepare(
        `
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(token, userId, expiresAt, createdAt);
  }

  findValid(token, nowIso) {
    const row = this.db
      .prepare(
        `
      SELECT token, user_id, expires_at, created_at
      FROM sessions
      WHERE token = ? AND expires_at > ?
      LIMIT 1
    `,
      )
      .get(token, nowIso);

    if (!row) {
      return null;
    }

    return {
      token: row.token,
      userId: row.user_id,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  delete(token) {
    this.db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  }

  deleteExpired(nowIso) {
    this.db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).run(nowIso);
  }
}
