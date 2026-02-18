import { getDatabase } from "../index";

export interface ChangeLogEntry {
  id?: number;
  timestamp?: string;
  user_id?: string;
  device_id?: string;
  session_id?: string | null;
  entity_type: "project" | "task" | "column";
  entity_id: string;
  project_id?: string | null;
  action: "create" | "update" | "delete" | "move";
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: string;
  vector_clock?: string;
  synced?: number;
}

/**
 * Logs a single change to the change_log table.
 */
export function logChange(entry: ChangeLogEntry): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO change_log
      (user_id, device_id, session_id, entity_type, entity_id, project_id,
       action, field, old_value, new_value, metadata, vector_clock, synced)
     VALUES
      (@user_id, @device_id, @session_id, @entity_type, @entity_id, @project_id,
       @action, @field, @old_value, @new_value, @metadata, @vector_clock, @synced)`
  ).run({
    user_id: entry.user_id ?? "local",
    device_id: entry.device_id ?? "local",
    session_id: entry.session_id ?? null,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    project_id: entry.project_id ?? null,
    action: entry.action,
    field: entry.field ?? null,
    old_value: entry.old_value ?? null,
    new_value: entry.new_value ?? null,
    metadata: entry.metadata ?? "{}",
    vector_clock: entry.vector_clock ?? "{}",
    synced: entry.synced ?? 0,
  });
}

/**
 * Logs field-level diffs between an old and new object.
 * Only changed fields are logged as separate entries.
 */
export function logFieldChanges(
  entityType: "project" | "task" | "column",
  entityId: string,
  projectId: string | null,
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack: string[]
): void {
  for (const field of fieldsToTrack) {
    const oldVal = JSON.stringify(oldObj[field] ?? null);
    const newVal = JSON.stringify(newObj[field] ?? null);

    if (oldVal !== newVal) {
      logChange({
        entity_type: entityType,
        entity_id: entityId,
        project_id: projectId,
        action: "update",
        field,
        old_value: oldVal,
        new_value: newVal,
      });
    }
  }
}

/**
 * Retrieves change log entries for a specific entity.
 */
export function getEntityHistory(
  entityType: string,
  entityId: string
): ChangeLogEntry[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM change_log
       WHERE entity_type = ? AND entity_id = ?
       ORDER BY timestamp DESC`
    )
    .all(entityType, entityId) as ChangeLogEntry[];
}

/**
 * Retrieves change log entries for a specific project (across all entities).
 */
export function getProjectHistory(projectId: string): ChangeLogEntry[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM change_log
       WHERE project_id = ?
       ORDER BY timestamp DESC`
    )
    .all(projectId) as ChangeLogEntry[];
}

/**
 * Retrieves all unsynced changes (for future collaborative sync).
 */
export function getUnsyncedChanges(): ChangeLogEntry[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM change_log
       WHERE synced = 0
       ORDER BY timestamp ASC`
    )
    .all() as ChangeLogEntry[];
}

/**
 * Marks changes as synced (for future collaborative sync).
 */
export function markChangesSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getDatabase();
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(
    `UPDATE change_log SET synced = 1 WHERE id IN (${placeholders})`
  ).run(...ids);
}

/**
 * Gets changes since a specific timestamp (for future sync protocol).
 */
export function getChangesSince(since: string): ChangeLogEntry[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM change_log
       WHERE timestamp > ?
       ORDER BY timestamp ASC`
    )
    .all(since) as ChangeLogEntry[];
}
