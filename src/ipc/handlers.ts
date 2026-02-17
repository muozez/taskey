import { ipcMain } from "electron";
import * as projectRepo from "../database/repositories/projects";
import * as taskRepo from "../database/repositories/tasks";
import * as changelogRepo from "../database/repositories/changelog";
import { getDatabase } from "../database/index";

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
    (_event, projectId: string, status: string, data: any) => {
      return taskRepo.createTask(projectId, status, data);
    }
  );

  ipcMain.handle("db:tasks:update", (_event, taskId: string, updates: any) => {
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
      projectDataMap: Record<
        string,
        {
          name: string;
          color: string;
          columns: { id: string; label: string; isDone?: boolean }[];
          backlog: any[];
          [key: string]: any;
        }
      >
    ) => {
      const db = getDatabase();

      const transaction = db.transaction(() => {
        for (const [pid, project] of Object.entries(projectDataMap)) {
          // Create project
          projectRepo.createProject(pid, project.name, project.color, project.columns);

          // Create tasks for each status
          const statuses = ["backlog", ...project.columns.map((c) => c.id)];
          for (const status of statuses) {
            const tasks = project[status] as any[];
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
}
