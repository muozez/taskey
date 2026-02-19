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

  // Run schema creation, version tracking, and migrations inside a single transaction
  const conn = db;
  const initTx = conn.transaction(() => {
    conn.exec(CREATE_TABLES);

    // Track schema version
    const versionRow = conn
      .prepare("SELECT value FROM schema_meta WHERE key = 'version'")
      .get() as { value: string } | undefined;

    if (!versionRow) {
      conn.prepare(
        "INSERT INTO schema_meta (key, value) VALUES ('version', ?)"
      ).run(String(SCHEMA_VERSION));
    } else {
      const currentVersion = parseInt(versionRow.value, 10);
      if (currentVersion < SCHEMA_VERSION) {
        runMigrations(conn, currentVersion, SCHEMA_VERSION);
        conn.prepare(
          "UPDATE schema_meta SET value = ? WHERE key = 'version'"
        ).run(String(SCHEMA_VERSION));
      }
    }
  });

  initTx();

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

  if (fromVersion < 3) {
    console.log("[Taskey DB] Migrating to v3: adding sync_connections, sync_conflicts tables");
    database.exec(`
      CREATE TABLE IF NOT EXISTS sync_connections (
        id TEXT PRIMARY KEY,
        server_url TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        workspace_name TEXT NOT NULL,
        client_id TEXT NOT NULL,
        join_key TEXT NOT NULL,
        sync_strategy TEXT NOT NULL DEFAULT 'auto-merge',
        current_version INTEGER NOT NULL DEFAULT 0,
        last_synced_version INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        diff_id TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        field TEXT DEFAULT NULL,
        client_value TEXT DEFAULT NULL,
        server_value TEXT DEFAULT NULL,
        reason TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        resolution TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at TEXT DEFAULT NULL,
        FOREIGN KEY (connection_id) REFERENCES sync_connections(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_connection
        ON sync_conflicts(connection_id);
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status
        ON sync_conflicts(status);
    `);
  }
}
