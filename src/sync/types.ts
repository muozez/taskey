/**
 * Type definitions for the Taskey Remote Sync API.
 * Derived from the OpenAPI 3.0.3 specification.
 *
 * Local-first offline sync architecture:
 * - Each local client works independently with SQLite
 * - Changes are tracked as diffs (entity, action, field, oldValue, newValue)
 * - Diffs are pushed to the remote server when online
 * - Remote changes are pulled and applied locally
 * - Conflicts are resolved based on workspace sync strategy
 */

// ── Entity & Action Enums ───────────────────────────────

export type SyncEntity = "task" | "project" | "column" | "label" | "comment";
export type SyncAction = "create" | "update" | "delete";
export type SyncStrategy = "auto-merge" | "last-writer-wins" | "server-wins" | "manual";
export type WorkspaceStatus = "online" | "offline" | "pending";
export type ConflictResolution = "accept" | "reject";

// ── DiffData ────────────────────────────────────────────

/** Single change record. Client produces this for every local mutation. */
export interface DiffData {
  entity: SyncEntity;
  entityId: string;
  action: SyncAction;
  /** Updated field name. null for create/delete. Field-level merge uses this. */
  field: string | null;
  /** Previous value (for update). */
  oldValue: unknown;
  /** New value. create: full object, update: new field value, delete: null */
  newValue: unknown;
}

// ── Connected Client ────────────────────────────────────

export interface ConnectedClient {
  clientId: string;
  name: string;
  hostname: string;
  isOnline: boolean;
  lastSyncedVersion: number;
  lastSeenAt: string;
}

// ── Workspace ───────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  abbr?: string;
  color?: string;
  status: WorkspaceStatus;
  statusText?: string;
  server?: string;
  description?: string;
  joinKey: string;
  currentVersion: number;
  syncStrategy: SyncStrategy;
  members?: number;
  createdAt?: string;
  connectedClients?: ConnectedClient[];
}

// ── Auth ────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: { name: string; email: string; role: string };
}

// ── Join ────────────────────────────────────────────────

export interface JoinRequest {
  joinKey: string;
  clientName?: string;
  hostname?: string;
}

export interface JoinResponse {
  success: boolean;
  message: string;
  workspace: {
    id: string;
    name: string;
    status: string;
    currentVersion: number;
    syncStrategy: SyncStrategy;
  };
  client: ConnectedClient;
}

export interface ValidateKeyRequest {
  joinKey: string;
}

export interface ValidateKeyResponse {
  success: boolean;
  message?: string;
  workspace?: {
    id: string;
    name: string;
  };
}

// ── Sync — Push ─────────────────────────────────────────

export interface PushDiffItem {
  baseVersion: number;
  data: DiffData;
  clientTimestamp: string;
}

export interface PushRequest {
  clientId: string;
  diffs: PushDiffItem[];
}

export interface AutoResolvedDetail {
  entity: string;
  entityId: string;
  field: string;
  strategy: string;
}

export interface ConflictDetail {
  diffId: string;
  reason: string;
  data: DiffData;
  serverVersion: unknown | null;
}

export interface PushResponse {
  success: boolean;
  accepted: number;
  rejected: number;
  conflicts: number;
  autoResolved: number;
  autoResolvedDetails?: AutoResolvedDetail[];
  conflictDetails?: ConflictDetail[];
  currentVersion: number;
  strategy: string;
}

// ── Sync — Pull ─────────────────────────────────────────

export interface PullDiffItem {
  id: string;
  data: DiffData;
  appliedVersion: number;
  clientTimestamp: string;
  serverTimestamp: string;
}

export interface SnapshotData {
  version: number;
  data: Record<string, Record<string, Record<string, unknown>>>;
  createdAt?: string;
  appliedDiffIds?: string[];
}

export interface PendingConflict {
  diffId: string;
  data: DiffData;
  reason: string;
  clientTimestamp: string;
}

export interface PullResponse {
  success: boolean;
  upToDate: boolean;
  currentVersion: number;
  fromVersion: number;
  syncStrategy: SyncStrategy;
  diffs: PullDiffItem[];
  snapshot: SnapshotData | null;
  pendingConflicts: PendingConflict[];
}

// ── Sync — Full Sync ────────────────────────────────────

export interface FullSyncRequest {
  clientId: string;
}

export interface FullSyncResponse {
  success: boolean;
  workspaceId: string;
  workspaceName: string;
  currentVersion: number;
  syncStrategy: SyncStrategy;
  snapshot: SnapshotData;
  pendingConflicts: PendingConflict[];
}

// ── Sync — Heartbeat ────────────────────────────────────

export interface HeartbeatRequest {
  clientId: string;
}

export interface HeartbeatResponse {
  success: boolean;
  currentVersion: number;
  lastSyncedVersion: number;
  hasPendingUpdates: boolean;
  pendingConflicts: number;
  syncStrategy: SyncStrategy;
}

// ── Sync — Dashboard (Resolve) ──────────────────────────

export interface ResolveRequest {
  diffId: string;
  resolution: ConflictResolution;
}

export interface ResolveBatchRequest {
  resolutions: ResolveRequest[];
}

// ── Sync — Status ───────────────────────────────────────

export interface SyncStatusResponse {
  success: boolean;
  workspaceId: string;
  currentVersion: number;
  syncStrategy: SyncStrategy;
  totalDiffs: number;
  appliedDiffs: number;
  pendingDiffs: number;
  conflictDiffs: number;
  rejectedDiffs: number;
  clients: (ConnectedClient & { behindVersions: number })[];
}

// ── Local Sync Connection (stored in SQLite) ────────────

export interface SyncConnection {
  id: string;
  server_url: string;
  workspace_id: string;
  workspace_name: string;
  client_id: string;
  join_key: string;
  sync_strategy: SyncStrategy;
  current_version: number;
  last_synced_version: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ── Local Sync Conflict (stored in SQLite) ──────────────

export interface SyncConflictRow {
  id: string;
  connection_id: string;
  diff_id: string;
  entity: string;
  entity_id: string;
  field: string | null;
  client_value: string | null;
  server_value: string | null;
  reason: string | null;
  status: "pending" | "resolved";
  resolution: ConflictResolution | null;
  created_at: string;
  resolved_at: string | null;
}

// ── API response wrapper ────────────────────────────────

export interface ApiResponse<T> {
  status: number;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
}

// ── Sync Engine Status ──────────────────────────────────

export interface SyncEngineStatus {
  connected: boolean;
  connectionId: string | null;
  serverUrl: string | null;
  workspaceName: string | null;
  clientId: string | null;
  currentVersion: number;
  lastSyncedVersion: number;
  syncStrategy: SyncStrategy | null;
  pendingPushCount: number;
  pendingConflicts: number;
  isOnline: boolean;
  lastHeartbeat: string | null;
  lastPush: string | null;
  lastPull: string | null;
}
