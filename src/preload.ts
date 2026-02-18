import { contextBridge, ipcRenderer } from "electron";

/**
 * Preload script – runs in an isolated context before the renderer.
 * Exposes a safe `window.taskey` API using contextBridge.
 */
contextBridge.exposeInMainWorld("taskey", {
  // ── Projects ──────────────────────────────────────────
  projects: {
    getAll: () => ipcRenderer.invoke("db:projects:getAll"),
    get: (id: string) => ipcRenderer.invoke("db:projects:get", id),
    create: (
      id: string,
      name: string,
      color: string,
      columns: { id: string; label: string; isDone?: boolean }[]
    ) => ipcRenderer.invoke("db:projects:create", id, name, color, columns),
    update: (id: string, updates: { name?: string; color?: string }) =>
      ipcRenderer.invoke("db:projects:update", id, updates),
    delete: (id: string) => ipcRenderer.invoke("db:projects:delete", id),
  },

  // ── Columns ───────────────────────────────────────────
  columns: {
    add: (projectId: string, columnId: string, label: string, isDone: boolean) =>
      ipcRenderer.invoke("db:columns:add", projectId, columnId, label, isDone),
    rename: (projectId: string, columnId: string, newLabel: string) =>
      ipcRenderer.invoke("db:columns:rename", projectId, columnId, newLabel),
    delete: (projectId: string, columnId: string) =>
      ipcRenderer.invoke("db:columns:delete", projectId, columnId),
    reorder: (projectId: string, columnIds: string[]) =>
      ipcRenderer.invoke("db:columns:reorder", projectId, columnIds),
  },

  // ── Tasks ─────────────────────────────────────────────
  tasks: {
    getByProject: (projectId: string) =>
      ipcRenderer.invoke("db:tasks:getByProject", projectId),
    get: (taskId: string) => ipcRenderer.invoke("db:tasks:get", taskId),
    getAll: () => ipcRenderer.invoke("db:tasks:getAll"),
    create: (projectId: string, status: string, data: any) =>
      ipcRenderer.invoke("db:tasks:create", projectId, status, data),
    update: (taskId: string, updates: any) =>
      ipcRenderer.invoke("db:tasks:update", taskId, updates),
    move: (taskId: string, newStatus: string, newProgress?: number) =>
      ipcRenderer.invoke("db:tasks:move", taskId, newStatus, newProgress),
    delete: (taskId: string) => ipcRenderer.invoke("db:tasks:delete", taskId),
  },

  // ── Change Log ────────────────────────────────────────
  changelog: {
    entity: (entityType: string, entityId: string) =>
      ipcRenderer.invoke("db:changelog:entity", entityType, entityId),
    project: (projectId: string) =>
      ipcRenderer.invoke("db:changelog:project", projectId),
    unsynced: () => ipcRenderer.invoke("db:changelog:unsynced"),
    since: (timestamp: string) =>
      ipcRenderer.invoke("db:changelog:since", timestamp),
  },

  // ── Seed ──────────────────────────────────────────────
  hasData: () => ipcRenderer.invoke("db:hasData"),
  seed: (data: any) => ipcRenderer.invoke("db:seed", data),

  // ── Settings ────────────────────────────────────────────
  settings: {
    getAll: () => ipcRenderer.invoke("db:settings:getAll"),
    get: (key: string) => ipcRenderer.invoke("db:settings:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("db:settings:set", key, value),
    setMultiple: (settings: Record<string, string>) =>
      ipcRenderer.invoke("db:settings:setMultiple", settings),
    delete: (key: string) => ipcRenderer.invoke("db:settings:delete", key),
  },

  // ── Command Aliases ─────────────────────────────────────
  aliases: {
    getAll: () => ipcRenderer.invoke("db:aliases:getAll"),
    set: (alias: string, command: string) =>
      ipcRenderer.invoke("db:aliases:set", alias, command),
    delete: (alias: string) => ipcRenderer.invoke("db:aliases:delete", alias),
    setAll: (aliases: Record<string, string>) =>
      ipcRenderer.invoke("db:aliases:setAll", aliases),
  },
});
