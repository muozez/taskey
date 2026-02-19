/**
 * Database repository for sync connection and conflict management.
 * Handles CRUD operations for sync_connections and sync_conflicts tables.
 */

import { getDatabase } from "../index";
import type { SyncConnection, SyncConflictRow, SyncStrategy, ConflictResolution } from "../../sync/types";

// ── Sync Connections ────────────────────────────────────

/**
 * Get all sync connections.
 */
export function getAllConnections(): SyncConnection[] {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM sync_connections ORDER BY created_at DESC")
    .all() as SyncConnection[];
}

/**
 * Get active sync connections.
 */
export function getActiveConnections(): SyncConnection[] {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM sync_connections WHERE is_active = 1 ORDER BY created_at DESC")
    .all() as SyncConnection[];
}

/**
 * Get a sync connection by ID.
 */
export function getConnection(id: string): SyncConnection | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM sync_connections WHERE id = ?")
    .get(id) as SyncConnection | undefined;
  return row ?? null;
}

/**
 * Get a sync connection by workspace ID.
 */
export function getConnectionByWorkspace(workspaceId: string): SyncConnection | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM sync_connections WHERE workspace_id = ?")
    .get(workspaceId) as SyncConnection | undefined;
  return row ?? null;
}

/**
 * Create a new sync connection after successfully joining a remote workspace.
 */
export function createConnection(params: {
  id: string;
  serverUrl: string;
  workspaceId: string;
  workspaceName: string;
  clientId: string;
  joinKey: string;
  syncStrategy: SyncStrategy;
  currentVersion: number;
}): SyncConnection {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO sync_connections
      (id, server_url, workspace_id, workspace_name, client_id, join_key,
       sync_strategy, current_version, last_synced_version, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`
  ).run(
    params.id,
    params.serverUrl,
    params.workspaceId,
    params.workspaceName,
    params.clientId,
    params.joinKey,
    params.syncStrategy,
    params.currentVersion,
    now,
    now
  );

  return getConnection(params.id)!;
}

/**
 * Update connection version info after sync operations.
 */
export function updateConnectionVersion(
  connectionId: string,
  currentVersion: number,
  lastSyncedVersion?: number
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (lastSyncedVersion !== undefined) {
    db.prepare(
      `UPDATE sync_connections
       SET current_version = ?, last_synced_version = ?, updated_at = ?
       WHERE id = ?`
    ).run(currentVersion, lastSyncedVersion, now, connectionId);
  } else {
    db.prepare(
      `UPDATE sync_connections
       SET current_version = ?, updated_at = ?
       WHERE id = ?`
    ).run(currentVersion, now, connectionId);
  }
}

/**
 * Update connection sync strategy.
 */
export function updateConnectionStrategy(
  connectionId: string,
  strategy: SyncStrategy
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE sync_connections SET sync_strategy = ?, updated_at = ? WHERE id = ?"
  ).run(strategy, now, connectionId);
}

/**
 * Deactivate a connection (soft delete).
 */
export function deactivateConnection(connectionId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE sync_connections SET is_active = 0, updated_at = ? WHERE id = ?"
  ).run(now, connectionId);
}

/**
 * Delete a connection and all its conflicts.
 */
export function deleteConnection(connectionId: string): void {
  const db = getDatabase();
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM sync_conflicts WHERE connection_id = ?").run(connectionId);
    db.prepare("DELETE FROM sync_connections WHERE id = ?").run(connectionId);
  });
  transaction();
}

// ── Sync Conflicts ──────────────────────────────────────

/**
 * Get all pending conflicts for a connection.
 */
export function getPendingConflicts(connectionId: string): SyncConflictRow[] {
  const db = getDatabase();
  return db
    .prepare(
      "SELECT * FROM sync_conflicts WHERE connection_id = ? AND status = 'pending' ORDER BY created_at ASC"
    )
    .all(connectionId) as SyncConflictRow[];
}

/**
 * Get all conflicts (pending + resolved) for a connection.
 */
export function getAllConflicts(connectionId: string): SyncConflictRow[] {
  const db = getDatabase();
  return db
    .prepare(
      "SELECT * FROM sync_conflicts WHERE connection_id = ? ORDER BY created_at DESC"
    )
    .all(connectionId) as SyncConflictRow[];
}

/**
 * Create a conflict record from a push response.
 */
export function createConflict(params: {
  id: string;
  connectionId: string;
  diffId: string;
  entity: string;
  entityId: string;
  field: string | null;
  clientValue: string | null;
  serverValue: string | null;
  reason: string | null;
}): SyncConflictRow {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO sync_conflicts
      (id, connection_id, diff_id, entity, entity_id, field,
       client_value, server_value, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(
    params.id,
    params.connectionId,
    params.diffId,
    params.entity,
    params.entityId,
    params.field,
    params.clientValue,
    params.serverValue,
    params.reason
  );

  return db
    .prepare("SELECT * FROM sync_conflicts WHERE id = ?")
    .get(params.id) as SyncConflictRow;
}

/**
 * Resolve a conflict locally.
 */
export function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE sync_conflicts
     SET status = 'resolved', resolution = ?, resolved_at = ?
     WHERE id = ?`
  ).run(resolution, now, conflictId);
}

/**
 * Get count of pending conflicts for a connection.
 */
export function getPendingConflictCount(connectionId: string): number {
  const db = getDatabase();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM sync_conflicts WHERE connection_id = ? AND status = 'pending'"
    )
    .get(connectionId) as { count: number };
  return row.count;
}
