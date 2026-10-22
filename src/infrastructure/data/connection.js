import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrateAppointmentsSchema, SCHEMA_STATEMENTS } from "./schema.js";
import { seedCatalog } from "./seed.js";

export function resolveDatabasePath(rootDir) {
  return process.env.DATABASE_PATH || path.join(rootDir, "data", "techroute.db");
}

export function createConnection(rootDir) {
  const databasePath = resolveDatabasePath(rootDir);
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  for (const statement of SCHEMA_STATEMENTS) {
    db.exec(statement);
  }

  migrateAppointmentsSchema(db);
  seedCatalog(db);
  return db;
}
