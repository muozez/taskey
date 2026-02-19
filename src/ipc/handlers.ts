import { ipcMain } from "electron";
import * as projectRepo from "../database/repositories/projects";
import * as taskRepo from "../database/repositories/tasks";
import * as changelogRepo from "../database/repositories/changelog";
import * as settingsRepo from "../database/repositories/settings";
import { getDatabase } from "../database/index";
import * as syncEngine from "../sync/sync-engine";
import type { TaskData } from "../database/repositories/tasks";
import type { ConflictResolution } from "../sync/types";

/* ── DTO types for IPC payloads ────────────────────────── */

/** Payload for creating a task via IPC */
interface CreateTaskPayload {
  id: string;
  title: string;
  desc?: string;
  priority?: string;
  avatar?: string;
  avatarColor?: string;
  dueDate?: string;
  dueTime?: string;
  duration?: string;
  progress?: number;
  tags?: string[];
  checklist?: { text: string; done: boolean }[];
  createdAt?: string;
}

/** Payload for updating a task via IPC */
interface UpdateTaskPayload {
  title?: string;
  desc?: string;
  priority?: string;
  avatar?: string;
  avatarColor?: string;
  dueDate?: string;
  dueTime?: string;
  duration?: string;
  progress?: number;
  tags?: string[];
  checklist?: { text: string; done: boolean }[];
  status?: string;
}

/** Payload for seeding project data via IPC */
interface SeedProjectPayload {
  name: string;
  color: string;
  columns: { id: string; label: string; isDone?: boolean }[];
  backlog: CreateTaskPayload[];
  [key: string]: unknown;
}

/**
 * Registers all IPC handlers for database operations.
 * The renderer communicates with the main process through these channels.
 */
export function registerIpcHandlers(): void {
  // ── Project Handlers ──────────────────────────────────

  ipcMain.handle("db:projects:getAll", () => {
    return projectRepo.getAllProjects();
  });

  ipcMain.handle("db:projects:get", (_event, projectId: string) => {
    return projectRepo.getProject(projectId);
  });

  ipcMain.handle(
    "db:projects:create",
    (
      _event,
      id: string,
      name: string,
      color: string,
      columns: { id: string; label: string; isDone?: boolean }[]
    ) => {
      return projectRepo.createProject(id, name, color, columns);
    }
  );

  ipcMain.handle(
    "db:projects:update",
    (_event, projectId: string, updates: { name?: string; color?: string }) => {
      projectRepo.updateProject(projectId, updates);
      return projectRepo.getProject(projectId);
    }
  );

  ipcMain.handle("db:projects:delete", (_event, projectId: string) => {
    projectRepo.deleteProject(projectId);
    return true;
  });

  // ── Column Handlers ───────────────────────────────────

  ipcMain.handle(
    "db:columns:add",
    (
      _event,
      projectId: string,
      columnId: string,
      label: string,
      isDone: boolean
    ) => {
      projectRepo.addColumn(projectId, columnId, label, isDone);
      return projectRepo.getProject(projectId);
    }
  );

  ipcMain.handle(
    "db:columns:rename",
    (_event, projectId: string, columnId: string, newLabel: string) => {
      projectRepo.renameColumn(projectId, columnId, newLabel);
      return true;
    }
  );

  ipcMain.handle(
    "db:columns:delete",
    (_event, projectId: string, columnId: string) => {
      projectRepo.deleteColumn(projectId, columnId);
      return projectRepo.getProject(projectId);
    }
  );

  ipcMain.handle(
    "db:columns:reorder",
    (_event, projectId: string, columnIds: string[]) => {
      projectRepo.reorderColumns(projectId, columnIds);
      return true;
    }
  );

  // ── Task Handlers ─────────────────────────────────────

  ipcMain.handle("db:tasks:getByProject", (_event, projectId: string) => {
    return taskRepo.getTasksByProject(projectId);
  });

  ipcMain.handle("db:tasks:get", (_event, taskId: string) => {
    return taskRepo.getTask(taskId);
  });

  ipcMain.handle("db:tasks:getAll", () => {
    return taskRepo.getAllTasks();
  });

  ipcMain.handle(
    "db:tasks:create",
    (_event, projectId: string, status: string, data: CreateTaskPayload) => {
      return taskRepo.createTask(projectId, status, data);
    }
  );

  ipcMain.handle("db:tasks:update", (_event, taskId: string, updates: UpdateTaskPayload) => {
    return taskRepo.updateTask(taskId, updates);
  });

  ipcMain.handle(
    "db:tasks:move",
    (_event, taskId: string, newStatus: string, newProgress?: number) => {
      taskRepo.moveTask(taskId, newStatus, newProgress);
      return true;
    }
  );

  ipcMain.handle("db:tasks:delete", (_event, taskId: string) => {
    taskRepo.deleteTask(taskId);
    return true;
  });

  // ── Change Log Handlers ───────────────────────────────

  ipcMain.handle(
    "db:changelog:entity",
    (_event, entityType: string, entityId: string) => {
      return changelogRepo.getEntityHistory(entityType, entityId);
    }
  );

  ipcMain.handle("db:changelog:project", (_event, projectId: string) => {
    return changelogRepo.getProjectHistory(projectId);
  });

  ipcMain.handle("db:changelog:unsynced", () => {
    return changelogRepo.getUnsyncedChanges();
  });

  ipcMain.handle("db:changelog:since", (_event, since: string) => {
    return changelogRepo.getChangesSince(since);
  });

  // ── Seed Handlers (for initial data migration) ────────

  ipcMain.handle("db:hasData", () => {
    const db = getDatabase();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM projects")
      .get() as { count: number };
    return row.count > 0;
  });

  ipcMain.handle(
    "db:seed",
    (
      _event,
      projectDataMap: Record<string, SeedProjectPayload>
    ) => {
      const db = getDatabase();

      const transaction = db.transaction(() => {
        for (const [pid, project] of Object.entries(projectDataMap)) {
          // Create project
          projectRepo.createProject(pid, project.name, project.color, project.columns);

          // Create tasks for each status
          const statuses = ["backlog", ...project.columns.map((c) => c.id)];
          for (const status of statuses) {
            const tasks = project[status] as CreateTaskPayload[];
            if (!tasks || !Array.isArray(tasks)) continue;
            for (const task of tasks) {
              taskRepo.createTask(pid, status, {
                id: task.id,
                title: task.title,
                desc: task.desc || "",
                priority: task.priority || "medium",
                avatar: task.avatar || "",
                avatarColor: task.avatarColor || "blue",
                dueDate: task.dueDate || "",
                dueTime: task.dueTime || "",
                duration: task.duration || "",
                progress: task.progress || 0,
                tags: task.tags || [],
                checklist: task.checklist || [],
                createdAt: task.createdAt || new Date().toISOString(),
              });
            }
          }
        }
      });

      transaction();
      return true;
    }
  );

  // ── Settings Handlers ───────────────────────────────────

  ipcMain.handle("db:settings:getAll", () => {
    return settingsRepo.getAllSettings();
  });

  ipcMain.handle("db:settings:get", (_event, key: string) => {
    return settingsRepo.getSetting(key);
  });

  ipcMain.handle(
    "db:settings:set",
    (_event, key: string, value: string) => {
      settingsRepo.setSetting(key, value);
      return true;
    }
  );

  ipcMain.handle(
    "db:settings:setMultiple",
    (_event, settings: Record<string, string>) => {
      settingsRepo.setSettings(settings);
      return true;
    }
  );

  ipcMain.handle("db:settings:delete", (_event, key: string) => {
    settingsRepo.deleteSetting(key);
    return true;
  });

  // ── Command Alias Handlers ────────────────────────────

  ipcMain.handle("db:aliases:getAll", () => {
    return settingsRepo.getAllAliases();
  });

  ipcMain.handle(
    "db:aliases:set",
    (_event, alias: string, command: string) => {
      settingsRepo.setAlias(alias, command);
      return true;
    }
  );

  ipcMain.handle("db:aliases:delete", (_event, alias: string) => {
    settingsRepo.deleteAlias(alias);
    return true;
  });

  ipcMain.handle(
    "db:aliases:setAll",
    (_event, aliases: Record<string, string>) => {
      settingsRepo.setAllAliases(aliases);
      return true;
    }
  );

  // ── Sync Handlers ───────────────────────────────────────

  /** Test connectivity to a remote server */
  ipcMain.handle("sync:testConnection", async (_event, serverUrl: string) => {
    return syncEngine.testConnection(serverUrl);
  });

  /** Validate a join key without joining */
  ipcMain.handle(
    "sync:validateKey",
    async (_event, serverUrl: string, joinKey: string) => {
      return syncEngine.validateKey(serverUrl, joinKey);
    }
  );

  /** Join a remote workspace via join key */
  ipcMain.handle(
    "sync:join",
    async (_event, serverUrl: string, joinKey: string, clientName?: string) => {
      return syncEngine.joinWorkspace(serverUrl, joinKey, clientName);
    }
  );

  /** Disconnect from a remote workspace */
  ipcMain.handle("sync:disconnect", (_event, connectionId?: string) => {
    syncEngine.disconnect(connectionId);
    return true;
  });

  /** Remove a connection entirely */
  ipcMain.handle("sync:removeConnection", (_event, connectionId: string) => {
    syncEngine.removeConnection(connectionId);
    return true;
  });

  /** Push pending local changes to the remote server */
  ipcMain.handle("sync:push", async (_event, connectionId?: string) => {
    return syncEngine.push(connectionId);
  });

  /** Pull remote changes and apply locally */
  ipcMain.handle("sync:pull", async (_event, connectionId?: string) => {
    return syncEngine.pull(connectionId);
  });

  /** Perform a full sync (get complete snapshot) */
  ipcMain.handle("sync:fullSync", async () => {
    return syncEngine.performFullSync();
  });

  /** Send heartbeat to check for pending updates */
  ipcMain.handle("sync:heartbeat", async (_event, connectionId?: string) => {
    return syncEngine.sendHeartbeat(connectionId);
  });

  /** Get sync engine status */
  ipcMain.handle("sync:status", () => {
    return syncEngine.getStatus();
  });

  /** Get all sync connections */
  ipcMain.handle("sync:getConnections", () => {
    return syncEngine.getConnections();
  });

  /** Get pending conflicts */
  ipcMain.handle("sync:getConflicts", (_event, connectionId?: string) => {
    return syncEngine.getConflicts(connectionId);
  });

  /** Resolve a sync conflict */
  ipcMain.handle(
    "sync:resolveConflict",
    (_event, conflictId: string, resolution: ConflictResolution) => {
      syncEngine.resolveConflict(conflictId, resolution);
      return true;
    }
  );

  /** Check if there's an active remote connection */
  ipcMain.handle("sync:hasConnection", () => {
    return syncEngine.hasActiveConnection();
  });
}
