/**
 * Diff Producer — converts local change_log entries into the API push format.
 *
 * The change_log already stores field-level changes in the format we need.
 * This module reads unsynced entries (synced=0) and produces PushDiffItem[].
 */

import { getDatabase } from "../database/index";
import type { ChangeLogEntry } from "../database/repositories/changelog";
import type { PushDiffItem, SyncAction, SyncEntity, DiffData } from "./types";

/**
 * Maps local change_log entity_type to API entity names.
 */
function mapEntity(entityType: string): SyncEntity {
  const mapping: Record<string, SyncEntity> = {
    task: "task",
    project: "project",
    column: "column",
    label: "label",
    comment: "comment",
  };
  return mapping[entityType] || (entityType as SyncEntity);
}

/**
 * Maps local change_log action to API action.
 * "move" is mapped to "update" with field="status".
 */
function mapAction(action: string): SyncAction {
  if (action === "move") return "update";
  return action as SyncAction;
}

/**
 * Parses a JSON string value, returns the parsed result or the original string.
 */
function parseValue(value: string | null | undefined): unknown {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Converts a single change_log entry to a DiffData object.
 */
function changeLogToDiffData(entry: ChangeLogEntry): DiffData {
  return {
    entity: mapEntity(entry.entity_type),
    entityId: entry.entity_id,
    action: mapAction(entry.action),
    field: entry.field ?? null,
    oldValue: parseValue(entry.old_value),
    newValue: parseValue(entry.new_value),
  };
}

/**
 * Gets all unsynced change_log entries and converts them to PushDiffItems.
 *
 * @param baseVersion - The workspace version when these diffs were created.
 *                      For offline batches, all diffs share the same base version.
 * @returns Array of push diff items with their corresponding change_log IDs.
 */
export function produceUnsyncedDiffs(baseVersion: number): {
  diffs: PushDiffItem[];
  changeLogIds: number[];
} {
  const db = getDatabase();
  const entries = db
    .prepare(
      `SELECT * FROM change_log
       WHERE synced = 0
       ORDER BY timestamp ASC`
    )
    .all() as (ChangeLogEntry & { id: number; timestamp: string })[];

  const diffs: PushDiffItem[] = [];
  const changeLogIds: number[] = [];

  for (const entry of entries) {
    diffs.push({
      baseVersion,
      data: changeLogToDiffData(entry),
      clientTimestamp: entry.timestamp,
    });
    changeLogIds.push(entry.id);
  }

  return { diffs, changeLogIds };
}

/**
 * Gets the count of unsynced changes.
 */
export function getUnsyncedCount(): number {
  const db = getDatabase();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM change_log WHERE synced = 0")
    .get() as { count: number };
  return row.count;
}

/**
 * Marks specific change_log entries as synced after successful push.
 */
export function markAsSynced(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getDatabase();
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(
    `UPDATE change_log SET synced = 1 WHERE id IN (${placeholders})`
  ).run(...ids);
}
