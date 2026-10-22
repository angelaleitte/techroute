export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS service_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    location TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    phone_secondary TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    visit_date TEXT NOT NULL,
    visit_time TEXT NOT NULL,
    technician_id TEXT NOT NULL,
    service_type_id TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    resource_ids TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open',
    cancellation_reason TEXT NOT NULL DEFAULT '',
    cancelled_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    FOREIGN KEY (service_type_id) REFERENCES service_types(id)
  )`,
];

const APPOINTMENT_MIGRATIONS = [
  { column: "status", sql: "ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'open'" },
  {
    column: "cancellation_reason",
    sql: "ALTER TABLE appointments ADD COLUMN cancellation_reason TEXT NOT NULL DEFAULT ''",
  },
  { column: "cancelled_at", sql: "ALTER TABLE appointments ADD COLUMN cancelled_at TEXT" },
  { column: "updated_at", sql: "ALTER TABLE appointments ADD COLUMN updated_at TEXT" },
  { column: "phone", sql: "ALTER TABLE appointments ADD COLUMN phone TEXT NOT NULL DEFAULT ''" },
  {
    column: "phone_secondary",
    sql: "ALTER TABLE appointments ADD COLUMN phone_secondary TEXT NOT NULL DEFAULT ''",
  },
  { column: "email", sql: "ALTER TABLE appointments ADD COLUMN email TEXT NOT NULL DEFAULT ''" },
];

export function migrateAppointmentsSchema(db) {
  const columns = new Set(
    db.prepare("PRAGMA table_info(appointments)").all().map((row) => row.name),
  );

  for (const migration of APPOINTMENT_MIGRATIONS) {
    if (!columns.has(migration.column)) {
      db.exec(migration.sql);
    }
  }
}
