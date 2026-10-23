import { Resource } from "../../core/entities/Resource.js";

function toEntity(row) {
  return new Resource({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
  });
}

export class SqliteResourceRepository {
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    const row = this.db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
    return row ? toEntity(row) : null;
  }

  listAll() {
    return this.db
      .prepare(
        `SELECT * FROM resources
         ORDER BY
           CASE category
             WHEN 'material' THEN 1
             WHEN 'ferramenta' THEN 2
             WHEN 'equipamento' THEN 3
             ELSE 4
           END,
           name ASC`,
      )
      .all()
      .map(toEntity);
  }

  findByIds(ids = []) {
    const uniqueIds = [...new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const placeholders = uniqueIds.map(() => "?").join(", ");
    const rows = this.db
      .prepare(`SELECT * FROM resources WHERE id IN (${placeholders})`)
      .all(...uniqueIds);

    const byId = new Map(rows.map((row) => [row.id, toEntity(row)]));
    return uniqueIds.map((id) => byId.get(id)).filter(Boolean);
  }
}
