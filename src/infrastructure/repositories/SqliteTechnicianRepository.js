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
}
