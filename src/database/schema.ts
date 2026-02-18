/**
 * Database schema definitions and migrations for Taskey.
 *
 * Architecture notes for future Collaborative features:
 * - change_log is append-only and tracks every mutation at field level
 * - Each log entry has user_id + device_id for multi-user/multi-device support
 * - synced flag enables offline-first sync: local changes are logged with synced=0,
 *   and marked synced=1 after successful push to remote
 * - vector_clock field (JSON) is reserved for conflict resolution via vector clocks / CRDTs
 * - session_id groups related changes into logical "commits"
 */

export const SCHEMA_VERSION = 2;

export const CREATE_TABLES = `
  -- ── Projects ────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'orange',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Columns (kanban columns per project) ────────────────
  CREATE TABLE IF NOT EXISTS columns (
    id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    label TEXT NOT NULL,
    is_done INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (id, project_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- ── Tasks ───────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'backlog',
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    avatar TEXT DEFAULT '',
    avatar_color TEXT DEFAULT 'blue',
    due_date TEXT DEFAULT NULL,
    due_time TEXT DEFAULT NULL,
    duration TEXT DEFAULT NULL,
    progress INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    checklist TEXT DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- ── Change Log ──────────────────────────────────────────
  -- Git-like append-only log of all mutations.
  -- Designed for future collaborative sync:
  --   • user_id / device_id identify the origin
  --   • session_id groups changes into logical commits
  --   • vector_clock is reserved for CRDT conflict resolution
  --   • synced tracks push status to remote (0 = pending, 1 = synced)
  CREATE TABLE IF NOT EXISTS change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    user_id TEXT NOT NULL DEFAULT 'local',
    device_id TEXT NOT NULL DEFAULT 'local',
    session_id TEXT DEFAULT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    project_id TEXT,
    action TEXT NOT NULL,
    field TEXT DEFAULT NULL,
    old_value TEXT DEFAULT NULL,
    new_value TEXT DEFAULT NULL,
    metadata TEXT DEFAULT '{}',
    vector_clock TEXT DEFAULT '{}',
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- ── Indices for Change Log ──────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_changelog_entity
    ON change_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_changelog_project
    ON change_log(project_id);
  CREATE INDEX IF NOT EXISTS idx_changelog_timestamp
    ON change_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_changelog_synced
    ON change_log(synced);
  CREATE INDEX IF NOT EXISTS idx_changelog_session
    ON change_log(session_id);

  -- ── User Settings ────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Command Aliases ─────────────────────────────────────
  CREATE TABLE IF NOT EXISTS command_aliases (
    alias TEXT PRIMARY KEY,
    command TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- ── Schema version tracking ─────────────────────────────
  CREATE TABLE IF NOT EXISTS schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
