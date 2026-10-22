import { ServiceType } from "../../core/entities/ServiceType.js";

function toEntity(row) {
  return new ServiceType({
    id: row.id,
    name: row.name,
    description: row.description,
  });
}

export class SqliteServiceTypeRepository {
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    const row = this.db.prepare("SELECT * FROM service_types WHERE id = ?").get(id);
    return row ? toEntity(row) : null;
  }

  listAll() {
    return this.db
      .prepare("SELECT * FROM service_types ORDER BY name ASC")
      .all()
      .map(toEntity);
  }
}
