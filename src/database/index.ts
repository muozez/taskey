import Database from "better-sqlite3";
import * as path from "path";
import { app } from "electron";
import { CREATE_TABLES, SCHEMA_VERSION } from "./schema";

let db: Database.Database | null = null;

/**
 * Returns the path where the SQLite database file is stored.
 * Uses Electron's userData directory so data persists across updates.
 */
function getDbPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "taskey.db");
}

/**
 * Initializes and returns the SQLite database connection.
 * Creates tables if they don't exist and runs any pending migrations.
 */
export function initDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  console.log(`[Taskey DB] Opening database at: ${dbPath}`);

  db = new Database(dbPath);

  // Performance pragmas
  db.pragma("journal_mode = WAL"); // Write-Ahead Logging for better concurrency
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  // Run schema creation inside a transaction
  db.exec(CREATE_TABLES);

  // Track schema version
  const versionRow = db
    .prepare("SELECT value FROM schema_meta WHERE key = 'version'")
    .get() as { value: string } | undefined;

  if (!versionRow) {
    db.prepare(
      "INSERT INTO schema_meta (key, value) VALUES ('version', ?)"
    ).run(String(SCHEMA_VERSION));
  } else {
    const currentVersion = parseInt(versionRow.value, 10);
    if (currentVersion < SCHEMA_VERSION) {
      runMigrations(db, currentVersion, SCHEMA_VERSION);
      db.prepare("UPDATE schema_meta SET value = ? WHERE key = 'version'").run(
        String(SCHEMA_VERSION)
      );
    }
  }

  console.log(`[Taskey DB] Database initialized (schema v${SCHEMA_VERSION})`);
  return db;
}

/**
 * Returns the current database instance. Throws if not initialized.
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

/**
 * Closes the database connection gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("[Taskey DB] Database closed.");
  }
}

/**
 * Placeholder for future schema migrations.
 * Each migration should be a function that transforms the schema
 * from version N to version N+1.
 */
function runMigrations(
  database: Database.Database,
  fromVersion: number,
  toVersion: number
): void {
  console.log(
    `[Taskey DB] Running migrations from v${fromVersion} to v${toVersion}`
  );
  if (fromVersion < 2) {
    console.log("[Taskey DB] Migrating to v2: adding user_settings and command_aliases tables");
    database.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS command_aliases (
        alias TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }
}
