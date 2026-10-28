export class SqliteUserRepository {
  constructor(db) {
    this.db = db;
  }

  findByUsername(username) {
    const row = this.db
      .prepare(
        `
      SELECT id, username, password_hash, display_name, role, technician_id, active
      FROM users
      WHERE username = ? COLLATE NOCASE
      LIMIT 1
    `,
      )
      .get(String(username || "").trim());

    return row ? mapUser(row) : null;
  }

  findById(id) {
    const row = this.db
      .prepare(
        `
      SELECT id, username, password_hash, display_name, role, technician_id, active
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
      )
      .get(id);

    return row ? mapUser(row) : null;
  }

  findByTechnicianId(technicianId) {
    const row = this.db
      .prepare(
        `
      SELECT id, username, password_hash, display_name, role, technician_id, active
      FROM users
      WHERE technician_id = ?
      LIMIT 1
    `,
      )
      .get(technicianId);

    return row ? mapUser(row) : null;
  }

  listAll() {
    return this.db
      .prepare(
        `
      SELECT id, username, password_hash, display_name, role, technician_id, active
      FROM users
      ORDER BY display_name COLLATE NOCASE ASC
    `,
      )
      .all()
      .map(mapUser);
  }

  create(user) {
    this.db
      .prepare(
        `
      INSERT INTO users (id, username, password_hash, display_name, role, technician_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        user.id,
        user.username,
        user.passwordHash,
        user.displayName,
        user.role,
        user.technicianId || null,
        user.active ? 1 : 0,
      );

    return this.findById(user.id);
  }

  update(id, { displayName, active }) {
    const result = this.db
      .prepare(
        `
      UPDATE users
      SET display_name = ?, active = ?
      WHERE id = ?
    `,
      )
      .run(displayName, active ? 1 : 0, id);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  updatePassword(id, passwordHash) {
    const result = this.db
      .prepare(
        `
      UPDATE users
      SET password_hash = ?
      WHERE id = ?
    `,
      )
      .run(passwordHash, id);

    return result.changes > 0;
  }
}

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    role: row.role,
    technicianId: row.technician_id || null,
    active: Boolean(row.active),
  };
}
