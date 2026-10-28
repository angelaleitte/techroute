import { Technician } from "../../core/entities/Technician.js";

function toEntity(row) {
  return new Technician({
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    active: Boolean(row.active),
  });
}

export class SqliteTechnicianRepository {
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    const row = this.db.prepare("SELECT * FROM technicians WHERE id = ?").get(id);
    return row ? toEntity(row) : null;
  }

  listActive() {
    return this.db
      .prepare("SELECT * FROM technicians WHERE active = 1 ORDER BY name ASC")
      .all()
      .map(toEntity);
  }

  listAll() {
    return this.db
      .prepare("SELECT * FROM technicians ORDER BY name ASC")
      .all()
      .map(toEntity);
  }

  create(technician) {
    this.db
      .prepare(
        `
      INSERT INTO technicians (id, name, specialty, active)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run(technician.id, technician.name, technician.specialty || "", technician.active ? 1 : 0);

    return this.findById(technician.id);
  }

  update(id, { name, specialty, active }) {
    const result = this.db
      .prepare(
        `
      UPDATE technicians
      SET name = ?, specialty = ?, active = ?
      WHERE id = ?
    `,
      )
      .run(name, specialty || "", active ? 1 : 0, id);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }
}
