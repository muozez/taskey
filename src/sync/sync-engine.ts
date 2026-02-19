/**
 * Sync Engine — orchestrates the offline-first sync lifecycle.
 *
 * Manages the complete sync flow:
 * 1. Join: Connect to a remote workspace via join key
 * 2. Full Sync: Get initial snapshot after joining
 * 3. Push: Send local changes (diffs) to the remote server
 * 4. Pull: Receive and apply remote changes
 * 5. Heartbeat: Maintain online presence and detect pending updates
 * 6. Conflict: Track and resolve sync conflicts
 *
 * The engine runs in the Electron main process and exposes methods
 * that IPC handlers call from renderer requests.
 */

import * as os from "os";
import * as crypto from "crypto";
import * as apiClient from "./api-client";
import * as diffProducer from "./diff-producer";
import * as diffConsumer from "./diff-consumer";
import * as syncRepo from "../database/repositories/sync";
import type {
  SyncConnection,
  SyncEngineStatus,
  SyncStrategy,
  PushResponse,
  PullResponse,
  HeartbeatResponse,
  FullSyncResponse,
  ConflictResolution,
  PendingConflict,
} from "./types";

// ── Engine State ────────────────────────────────────────

let activeConnectionId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let isOnline = false;
let lastHeartbeat: string | null = null;
let lastPush: string | null = null;
let lastPull: string | null = null;

/** Heartbeat interval in ms (30 seconds) */
const HEARTBEAT_INTERVAL = 30_000;
/** Pull interval in ms (60 seconds) */
const PULL_INTERVAL = 60_000;

// ── Initialization ──────────────────────────────────────

/**
 * Initialize the sync engine. Resumes active connections if any exist.
 * Should be called after database init.
 */
export function initSyncEngine(): void {
  console.log("[Sync Engine] Initializing...");

  const activeConnections = syncRepo.getActiveConnections();
  if (activeConnections.length > 0) {
    const conn = activeConnections[0];
    activeConnectionId = conn.id;
    console.log(
      `[Sync Engine] Resuming connection: ${conn.workspace_name} (${conn.server_url})`
    );
    startBackgroundSync(conn);
  } else {
    console.log("[Sync Engine] No active connections found.");
  }
}

/**
 * Shutdown the sync engine gracefully.
 */
export function shutdownSyncEngine(): void {
  console.log("[Sync Engine] Shutting down...");
  stopBackgroundSync();
  activeConnectionId = null;
  isOnline = false;
}

// ── Join Flow ───────────────────────────────────────────

/**
 * Validate a join key against a remote server.
 */
export async function validateKey(
  serverUrl: string,
  joinKey: string
): Promise<{ valid: boolean; workspaceName?: string; message?: string }> {
  try {
    const response = await apiClient.validateKey(serverUrl, joinKey);
    if (response.status === 200 && response.data.success) {
      return {
        valid: true,
        workspaceName: response.data.workspace?.name,
      };
    }
    return { valid: false, message: response.data.message ?? "Geçersiz anahtar" };
  } catch (err) {
    return { valid: false, message: `Bağlantı hatası: ${(err as Error).message}` };
  }
}

/**
 * Join a remote workspace and set up the sync connection.
 *
 * Flow:
 * 1. POST /api/join → get clientId + workspace info
 * 2. Save connection to local DB
 * 3. POST /api/sync/full → get initial snapshot
 * 4. Apply snapshot to local DB
 * 5. Start background sync (heartbeat + pull)
 */
export async function joinWorkspace(
  serverUrl: string,
  joinKey: string,
  clientName?: string
): Promise<{
  success: boolean;
  connectionId?: string;
  workspaceName?: string;
  message?: string;
}> {
  try {
    const hostname = os.hostname();
    const name = clientName || hostname;

    console.log(`[Sync Engine] Joining workspace via ${serverUrl}...`);

    // Step 1: Join
    const joinResponse = await apiClient.join(serverUrl, joinKey, name, hostname);
    if (joinResponse.status !== 200 || !joinResponse.data.success) {
      return {
        success: false,
        message: joinResponse.data.message ?? `Katılım başarısız (HTTP ${joinResponse.status})`,
      };
    }

    const { workspace: rawWorkspace, client: rawClient } = joinResponse.data;
    const connectionId = crypto.randomUUID();

    // Normalize server response: handle both camelCase and snake_case field names
    const ws = rawWorkspace as unknown as Record<string, unknown>;
    const cl = rawClient as unknown as Record<string, unknown>;
    const workspaceId = (ws.id ?? ws.workspace_id) as string;
    const workspaceName = (ws.name ?? ws.workspace_name) as string;
    const syncStrategy = ((ws.syncStrategy ?? ws.sync_strategy) as SyncStrategy) || "auto-merge";
    const currentVersion = ((ws.currentVersion ?? ws.current_version) as number) || 0;
    const clientId = ((cl.clientId ?? cl.client_id) as string);

    // Step 2: Check if we already have a connection to this workspace
    const existingConn = syncRepo.getConnectionByWorkspace(workspaceId);
    if (existingConn) {
      // Reactivate existing connection
      syncRepo.updateConnectionVersion(
        existingConn.id,
        currentVersion
      );
      if (!existingConn.is_active) {
        syncRepo.deleteConnection(existingConn.id);
      } else {
        // Already connected
        activeConnectionId = existingConn.id;
        startBackgroundSync(existingConn);
        return {
          success: true,
          connectionId: existingConn.id,
          workspaceName,
          message: "Mevcut bağlantı yeniden kullanıldı",
        };
      }
    }

    // Step 3: Save connection
    const connection = syncRepo.createConnection({
      id: connectionId,
      serverUrl,
      workspaceId,
      workspaceName,
      clientId,
      joinKey,
      syncStrategy,
      currentVersion,
    });

    // Step 4: Full sync to get initial data
    console.log("[Sync Engine] Performing initial full sync...");
    const fullSyncResult = await performFullSync(connection);
    if (!fullSyncResult.success) {
      console.warn(`[Sync Engine] Initial full sync failed: ${fullSyncResult.message}`);
      // Connection is saved but full sync failed - user can retry
    }

    // Step 5: Start background sync
    activeConnectionId = connectionId;
    startBackgroundSync(connection);

    console.log(
      `[Sync Engine] Successfully joined workspace: ${workspaceName}`
    );

    return {
      success: true,
      connectionId,
      workspaceName,
    };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[Sync Engine] Join failed: ${message}`);
    return { success: false, message: `Katılım hatası: ${message}` };
  }
}

/**
 * Disconnect from a remote workspace.
 */
export function disconnect(connectionId?: string): void {
  const connId = connectionId ?? activeConnectionId;
  if (!connId) return;

  stopBackgroundSync();
  syncRepo.deactivateConnection(connId);

  if (activeConnectionId === connId) {
    activeConnectionId = null;
    isOnline = false;
  }

  console.log(`[Sync Engine] Disconnected from connection: ${connId}`);
}

/**
 * Remove a connection entirely (including conflict history).
 */
export function removeConnection(connectionId: string): void {
  disconnect(connectionId);
  syncRepo.deleteConnection(connectionId);
  console.log(`[Sync Engine] Removed connection: ${connectionId}`);
}

// ── Push ────────────────────────────────────────────────

/**
 * Push all pending local changes to the remote server.
 *
 * 1. Collect unsynced change_log entries
 * 2. Convert to DiffData format
 * 3. POST /api/sync/push
 * 4. Mark pushed entries as synced
 * 5. Handle conflicts from push response
 */
export async function push(connectionId?: string): Promise<{
  success: boolean;
  pushed: number;
  conflicts: number;
  message?: string;
}> {
  const conn = getActiveConnection(connectionId);
  if (!conn) {
    return { success: false, pushed: 0, conflicts: 0, message: "Aktif bağlantı yok" };
  }

  try {
    const { diffs, changeLogIds } = diffProducer.produceUnsyncedDiffs(
      conn.last_synced_version
    );

    if (diffs.length === 0) {
      return { success: true, pushed: 0, conflicts: 0, message: "Gönderilecek değişiklik yok" };
    }

    console.log(`[Sync Engine] Pushing ${diffs.length} diffs...`);

    const response = await apiClient.pushDiffs(conn.server_url, {
      clientId: conn.client_id,
      diffs,
    });

    if (response.status !== 200 || !response.data.success) {
      return {
        success: false,
        pushed: 0,
        conflicts: 0,
        message: `Push başarısız (HTTP ${response.status})`,
      };
    }

    const pushResult = response.data;

    // Mark accepted diffs as synced
    if (pushResult.accepted > 0) {
      // Mark all change_log entries as synced (even rejected ones - they're processed)
      diffProducer.markAsSynced(changeLogIds);
    }

    // Update connection version
    syncRepo.updateConnectionVersion(
      conn.id,
      pushResult.currentVersion,
      pushResult.currentVersion
    );

    // Handle conflicts
    if (pushResult.conflictDetails && pushResult.conflictDetails.length > 0) {
      for (const conflict of pushResult.conflictDetails) {
        syncRepo.createConflict({
          id: crypto.randomUUID(),
          connectionId: conn.id,
          diffId: conflict.diffId,
          entity: conflict.data.entity,
          entityId: conflict.data.entityId,
          field: conflict.data.field,
          clientValue: conflict.data.newValue != null ? JSON.stringify(conflict.data.newValue) : null,
          serverValue: conflict.serverVersion != null ? JSON.stringify(conflict.serverVersion) : null,
          reason: conflict.reason,
        });
      }
    }

    lastPush = new Date().toISOString();

    console.log(
      `[Sync Engine] Push complete: ${pushResult.accepted} accepted, ${pushResult.rejected} rejected, ${pushResult.conflicts} conflicts`
    );

    return {
      success: true,
      pushed: pushResult.accepted,
      conflicts: pushResult.conflicts,
    };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[Sync Engine] Push failed: ${message}`);
    return { success: false, pushed: 0, conflicts: 0, message };
  }
}

// ── Pull ────────────────────────────────────────────────

/**
 * Pull remote changes and apply them locally.
 *
 * 1. GET /api/sync/pull?clientId=...&sinceVersion=...
 * 2. Apply diffs to local DB (with synced=1 to prevent re-push)
 * 3. Update connection version
 * 4. Store pending conflicts
 */
export async function pull(connectionId?: string): Promise<{
  success: boolean;
  applied: number;
  conflicts: number;
  message?: string;
}> {
  const conn = getActiveConnection(connectionId);
  if (!conn) {
    return { success: false, applied: 0, conflicts: 0, message: "Aktif bağlantı yok" };
  }

  try {
    console.log(
      `[Sync Engine] Pulling changes since version ${conn.last_synced_version}...`
    );

    const response = await apiClient.pullDiffs(
      conn.server_url,
      conn.client_id,
      conn.last_synced_version
    );

    if (response.status !== 200 || !response.data.success) {
      return {
        success: false,
        applied: 0,
        conflicts: 0,
        message: `Pull başarısız (HTTP ${response.status})`,
      };
    }

    const pullResult = response.data;

    if (pullResult.upToDate) {
      lastPull = new Date().toISOString();
      return { success: true, applied: 0, conflicts: 0, message: "Zaten güncel" };
    }

    // Apply diffs
    let appliedCount = 0;
    if (pullResult.diffs && pullResult.diffs.length > 0) {
      const maxVersion = diffConsumer.applyPullDiffs(pullResult.diffs);
      appliedCount = pullResult.diffs.length;
    }

    // If snapshot is provided (big version gap), apply it
    if (pullResult.snapshot) {
      diffConsumer.applySnapshot(pullResult.snapshot);
    }

    // Update connection version
    syncRepo.updateConnectionVersion(
      conn.id,
      pullResult.currentVersion,
      pullResult.currentVersion
    );

    // Update strategy if changed
    if (pullResult.syncStrategy) {
      syncRepo.updateConnectionStrategy(conn.id, pullResult.syncStrategy);
    }

    // Store pending conflicts
    if (pullResult.pendingConflicts && pullResult.pendingConflicts.length > 0) {
      storePendingConflicts(conn.id, pullResult.pendingConflicts);
    }

    lastPull = new Date().toISOString();

    console.log(
      `[Sync Engine] Pull complete: ${appliedCount} diffs applied, version → ${pullResult.currentVersion}`
    );

    return {
      success: true,
      applied: appliedCount,
      conflicts: pullResult.pendingConflicts?.length ?? 0,
    };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[Sync Engine] Pull failed: ${message}`);
    return { success: false, applied: 0, conflicts: 0, message };
  }
}

// ── Full Sync ───────────────────────────────────────────

/**
 * Perform a full sync (get complete snapshot from server).
 */
export async function performFullSync(
  connection?: SyncConnection
): Promise<{
  success: boolean;
  version?: number;
  message?: string;
}> {
  const conn = connection ?? getActiveConnection();
  if (!conn) {
    return { success: false, message: "Aktif bağlantı yok" };
  }

  try {
    console.log("[Sync Engine] Performing full sync...");

    const response = await apiClient.fullSync(conn.server_url, conn.client_id);

    if (response.status !== 200 || !response.data.success) {
      return {
        success: false,
        message: `Full sync başarısız (HTTP ${response.status})`,
      };
    }

    const fullSyncResult = response.data;

    // Apply snapshot
    if (fullSyncResult.snapshot) {
      diffConsumer.applySnapshot(fullSyncResult.snapshot);
    }

    // Update connection
    syncRepo.updateConnectionVersion(
      conn.id,
      fullSyncResult.currentVersion,
      fullSyncResult.currentVersion
    );

    if (fullSyncResult.syncStrategy) {
      syncRepo.updateConnectionStrategy(conn.id, fullSyncResult.syncStrategy);
    }

    // Store pending conflicts
    if (fullSyncResult.pendingConflicts?.length > 0) {
      storePendingConflicts(conn.id, fullSyncResult.pendingConflicts);
    }

    console.log(
      `[Sync Engine] Full sync complete: version ${fullSyncResult.currentVersion}`
    );

    return { success: true, version: fullSyncResult.currentVersion };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[Sync Engine] Full sync failed: ${message}`);
    return { success: false, message };
  }
}

// ── Heartbeat ───────────────────────────────────────────

/**
 * Send a heartbeat to the remote server.
 * Returns whether there are pending updates to pull.
 */
export async function sendHeartbeat(connectionId?: string): Promise<{
  success: boolean;
  hasPendingUpdates: boolean;
  pendingConflicts: number;
  message?: string;
}> {
  const conn = getActiveConnection(connectionId);
  if (!conn) {
    return { success: false, hasPendingUpdates: false, pendingConflicts: 0, message: "Aktif bağlantı yok" };
  }

  try {
    const response = await apiClient.heartbeat(conn.server_url, conn.client_id);

    if (response.status !== 200 || !response.data.success) {
      isOnline = false;
      return {
        success: false,
        hasPendingUpdates: false,
        pendingConflicts: 0,
        message: `Heartbeat başarısız (HTTP ${response.status})`,
      };
    }

    isOnline = true;
    lastHeartbeat = new Date().toISOString();

    const hbResult = response.data;

    // Update connection version from server
    syncRepo.updateConnectionVersion(conn.id, hbResult.currentVersion);

    // Update strategy if changed
    if (hbResult.syncStrategy) {
      syncRepo.updateConnectionStrategy(conn.id, hbResult.syncStrategy);
    }

    return {
      success: true,
      hasPendingUpdates: hbResult.hasPendingUpdates,
      pendingConflicts: hbResult.pendingConflicts,
    };
  } catch (err) {
    isOnline = false;
    return {
      success: false,
      hasPendingUpdates: false,
      pendingConflicts: 0,
      message: (err as Error).message,
    };
  }
}

// ── Conflict Resolution ─────────────────────────────────

/**
 * Get pending conflicts for the active connection.
 */
export function getConflicts(connectionId?: string) {
  const connId = connectionId ?? activeConnectionId;
  if (!connId) return [];
  return syncRepo.getPendingConflicts(connId);
}

/**
 * Resolve a conflict locally.
 */
export function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution
): void {
  syncRepo.resolveConflict(conflictId, resolution);
}

// ── Status ──────────────────────────────────────────────

/**
 * Get the current sync engine status.
 */
export function getStatus(): SyncEngineStatus {
  const conn = activeConnectionId ? syncRepo.getConnection(activeConnectionId) : null;

  return {
    connected: !!conn && conn.is_active === 1,
    connectionId: conn?.id ?? null,
    serverUrl: conn?.server_url ?? null,
    workspaceName: conn?.workspace_name ?? null,
    clientId: conn?.client_id ?? null,
    currentVersion: conn?.current_version ?? 0,
    lastSyncedVersion: conn?.last_synced_version ?? 0,
    syncStrategy: conn?.sync_strategy ?? null,
    pendingPushCount: diffProducer.getUnsyncedCount(),
    pendingConflicts: conn ? syncRepo.getPendingConflictCount(conn.id) : 0,
    isOnline,
    lastHeartbeat,
    lastPush,
    lastPull,
  };
}

/**
 * Get all sync connections.
 */
export function getConnections() {
  return syncRepo.getAllConnections();
}

// ── Background Sync ─────────────────────────────────────

/**
 * Start background sync timers (heartbeat + periodic pull).
 */
function startBackgroundSync(connection: SyncConnection): void {
  stopBackgroundSync();

  console.log(`[Sync Engine] Starting background sync for ${connection.workspace_name}`);

  // Initial heartbeat
  sendHeartbeat(connection.id).then((result) => {
    if (result.hasPendingUpdates) {
      pull(connection.id).catch(console.error);
    }
  }).catch(console.error);

  // Push any pending changes
  const pendingCount = diffProducer.getUnsyncedCount();
  if (pendingCount > 0) {
    push(connection.id).catch(console.error);
  }

  // Periodic heartbeat
  heartbeatTimer = setInterval(async () => {
    try {
      const result = await sendHeartbeat(connection.id);
      if (result.hasPendingUpdates) {
        await pull(connection.id);
      }
    } catch (err) {
      console.error("[Sync Engine] Heartbeat cycle error:", err);
    }
  }, HEARTBEAT_INTERVAL);

  // Periodic pull
  pullTimer = setInterval(async () => {
    try {
      // Push first, then pull
      const unsyncedCount = diffProducer.getUnsyncedCount();
      if (unsyncedCount > 0) {
        await push(connection.id);
      }
      await pull(connection.id);
    } catch (err) {
      console.error("[Sync Engine] Pull cycle error:", err);
    }
  }, PULL_INTERVAL);
}

/**
 * Stop background sync timers.
 */
function stopBackgroundSync(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (pullTimer) {
    clearInterval(pullTimer);
    pullTimer = null;
  }
}

// ── Helpers ─────────────────────────────────────────────

/**
 * Get the active connection, optionally by ID.
 */
function getActiveConnection(connectionId?: string): SyncConnection | null {
  const connId = connectionId ?? activeConnectionId;
  if (!connId) return null;
  return syncRepo.getConnection(connId);
}

/**
 * Store pending conflicts from server response.
 */
function storePendingConflicts(connectionId: string, conflicts: PendingConflict[]): void {
  for (const conflict of conflicts) {
    syncRepo.createConflict({
      id: crypto.randomUUID(),
      connectionId,
      diffId: conflict.diffId,
      entity: conflict.data.entity,
      entityId: conflict.data.entityId,
      field: conflict.data.field,
      clientValue: conflict.data.newValue != null ? JSON.stringify(conflict.data.newValue) : null,
      serverValue: null,
      reason: conflict.reason,
    });
  }
}

/**
 * Trigger an immediate push of pending changes.
 * Called by IPC handlers when the user makes a change and connection is active.
 */
export async function triggerPush(): Promise<void> {
  if (!activeConnectionId || !isOnline) return;

  const unsyncedCount = diffProducer.getUnsyncedCount();
  if (unsyncedCount > 0) {
    await push(activeConnectionId);
  }
}

/**
 * Check if there's an active sync connection.
 */
export function hasActiveConnection(): boolean {
  return activeConnectionId !== null;
}

/**
 * Test connection to a remote server.
 */
export async function testConnection(serverUrl: string): Promise<boolean> {
  return apiClient.testConnection(serverUrl);
}
