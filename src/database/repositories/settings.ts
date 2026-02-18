import { getDatabase } from "../index";

// ── User Settings ─────────────────────────────────────

/**
 * Get a single setting by key.
 */
export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT value FROM user_settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

/**
 * Get all settings as a key-value map.
 */
export function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT key, value FROM user_settings")
    .all() as { key: string; value: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

/**
 * Set a single setting (upsert).
 */
export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO user_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  ).run(key, value);
}

/**
 * Set multiple settings at once.
 */
export function setSettings(settings: Record<string, string>): void {
  const db = getDatabase();
  const stmt = db.prepare(
    `INSERT INTO user_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
  });
  transaction();
}

/**
 * Delete a setting.
 */
export function deleteSetting(key: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM user_settings WHERE key = ?").run(key);
}

// ── Command Aliases ───────────────────────────────────

/**
 * Get all command aliases.
 */
export function getAllAliases(): Record<string, string> {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT alias, command FROM command_aliases")
    .all() as { alias: string; command: string }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.alias] = row.command;
  }
  return result;
}

/**
 * Set a command alias (upsert).
 */
export function setAlias(alias: string, command: string): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO command_aliases (alias, command, created_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(alias) DO UPDATE SET command = excluded.command`
  ).run(alias, command);
}

/**
 * Delete a command alias.
 */
export function deleteAlias(alias: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM command_aliases WHERE alias = ?").run(alias);
}

/**
 * Set multiple aliases at once (replaces all).
 */
export function setAllAliases(aliases: Record<string, string>): void {
  const db = getDatabase();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM command_aliases").run();
    const stmt = db.prepare(
      `INSERT INTO command_aliases (alias, command, created_at)
       VALUES (?, ?, datetime('now'))`
    );
    for (const [alias, command] of Object.entries(aliases)) {
      stmt.run(alias, command);
    }
  });
  transaction();
}
