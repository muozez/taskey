/**
 * Diff Consumer — applies remote diffs and snapshots to the local SQLite database.
 *
 * Two modes:
 * 1. Snapshot mode: Full workspace state is written to local DB (used for initial sync)
 * 2. Incremental mode: Individual diffs are applied one by one (used for pull)
 *
 * Remote changes are logged to change_log with synced=1 to keep history
 * without triggering re-push.
 */

import { getDatabase } from "../database/index";
import { logChange } from "../database/repositories/changelog";
import type { DiffData, PullDiffItem, SnapshotData } from "./types";

// ── Snapshot Application ────────────────────────────────

/**
 * Applies a full snapshot to the local database.
 * This replaces all matching entities with the snapshot state.
 *
 * Used for:
 * - Initial sync after joining a workspace
 * - Recovery after long offline period
 * - Data integrity reset
 */
export function applySnapshot(snapshot: SnapshotData): void {
  const db = getDatabase();
  const data = snapshot.data;
  if (!data) return;

  const transaction = db.transaction(() => {
    // ── Apply Projects ──────────────────────────────
    if (data.projects) {
      for (const [projectId, projectData] of Object.entries(data.projects)) {
        const p = projectData as Record<string, unknown>;
        const existing = db
          .prepare("SELECT id FROM projects WHERE id = ?")
          .get(projectId);

        if (existing) {
          db.prepare(
            `UPDATE projects SET name = ?, color = ?, updated_at = ?
             WHERE id = ?`
          ).run(
            p.name ?? p.title ?? "Unnamed",
            p.color ?? "orange",
            new Date().toISOString(),
            projectId
          );
        } else {
          const maxOrder = (
            db.prepare("SELECT MAX(sort_order) as m FROM projects")
              .get() as { m: number | null }
          ).m ?? -1;

          db.prepare(
            `INSERT INTO projects (id, name, color, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            projectId,
            p.name ?? p.title ?? "Unnamed",
            p.color ?? "orange",
            maxOrder + 1,
            p.created_at as string ?? new Date().toISOString(),
            new Date().toISOString()
          );
        }

        // Log as synced (won't be pushed back)
        logChange({
          entity_type: "project",
          entity_id: projectId,
          project_id: projectId,
          action: existing ? "update" : "create",
          new_value: JSON.stringify(p),
          synced: 1,
          user_id: "remote",
          device_id: "remote",
        });
      }
    }

    // ── Apply Columns ───────────────────────────────
    if (data.columns) {
      for (const [columnId, columnData] of Object.entries(data.columns)) {
        const c = columnData as Record<string, unknown>;
        const projectId = c.project_id as string ?? c.projectId as string ?? "";
        const existing = db
          .prepare("SELECT id FROM columns WHERE id = ? AND project_id = ?")
          .get(columnId, projectId);

        if (existing) {
          db.prepare(
            `UPDATE columns SET label = ?, is_done = ?
             WHERE id = ? AND project_id = ?`
          ).run(
            c.label ?? c.name ?? "Column",
            c.is_done ?? c.isDone ?? 0,
            columnId,
            projectId
          );
        } else {
          const maxOrder = (
            db.prepare("SELECT MAX(sort_order) as m FROM columns WHERE project_id = ?")
              .get(projectId) as { m: number | null }
          ).m ?? -1;

          db.prepare(
            `INSERT INTO columns (id, project_id, label, is_done, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            columnId,
            projectId,
            c.label ?? c.name ?? "Column",
            c.is_done ?? c.isDone ?? 0,
            maxOrder + 1,
            new Date().toISOString()
          );
        }

        logChange({
          entity_type: "column",
          entity_id: columnId,
          project_id: projectId,
          action: existing ? "update" : "create",
          new_value: JSON.stringify(c),
          synced: 1,
          user_id: "remote",
          device_id: "remote",
        });
      }
    }

    // ── Apply Tasks ─────────────────────────────────
    if (data.tasks) {
      for (const [taskId, taskData] of Object.entries(data.tasks)) {
        const t = taskData as Record<string, unknown>;
        const projectId = t.project_id as string ?? t.projectId as string ?? "";
        const existing = db
          .prepare("SELECT id FROM tasks WHERE id = ?")
          .get(taskId);

        if (existing) {
          db.prepare(
            `UPDATE tasks SET
              project_id = ?, status = ?, title = ?, description = ?,
              priority = ?, avatar = ?, avatar_color = ?,
              due_date = ?, due_time = ?, duration = ?,
              progress = ?, tags = ?, checklist = ?, updated_at = ?
             WHERE id = ?`
          ).run(
            projectId,
            t.status ?? "backlog",
            t.title ?? "Untitled",
            t.description ?? t.desc ?? "",
            t.priority ?? "medium",
            t.avatar ?? "",
            t.avatar_color ?? t.avatarColor ?? "blue",
            t.due_date ?? t.dueDate ?? null,
            t.due_time ?? t.dueTime ?? null,
            t.duration ?? null,
            t.progress ?? 0,
            typeof t.tags === "string" ? t.tags : JSON.stringify(t.tags ?? []),
            typeof t.checklist === "string" ? t.checklist : JSON.stringify(t.checklist ?? []),
            new Date().toISOString(),
            taskId
          );
        } else {
          const maxOrder = (
            db.prepare(
              "SELECT MAX(sort_order) as m FROM tasks WHERE project_id = ? AND status = ?"
            ).get(projectId, t.status ?? "backlog") as { m: number | null }
          ).m ?? -1;

          db.prepare(
            `INSERT INTO tasks
              (id, project_id, status, title, description, priority, avatar, avatar_color,
               due_date, due_time, duration, progress, tags, checklist, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            taskId,
            projectId,
            t.status ?? "backlog",
            t.title ?? "Untitled",
            t.description ?? t.desc ?? "",
            t.priority ?? "medium",
            t.avatar ?? "",
            t.avatar_color ?? t.avatarColor ?? "blue",
            t.due_date ?? t.dueDate ?? null,
            t.due_time ?? t.dueTime ?? null,
            t.duration ?? null,
            t.progress ?? 0,
            typeof t.tags === "string" ? t.tags : JSON.stringify(t.tags ?? []),
            typeof t.checklist === "string" ? t.checklist : JSON.stringify(t.checklist ?? []),
            maxOrder + 1,
            t.created_at ?? new Date().toISOString(),
            new Date().toISOString()
          );
        }

        logChange({
          entity_type: "task",
          entity_id: taskId,
          project_id: projectId,
          action: existing ? "update" : "create",
          new_value: JSON.stringify(t),
          synced: 1,
          user_id: "remote",
          device_id: "remote",
        });
      }
    }
  });

  transaction();
}

// ── Incremental Diff Application ────────────────────────

/**
 * Applies a single diff to the local database.
 * Handles create, update, and delete actions for each entity type.
 */
export function applyDiff(diff: DiffData): void {
  switch (diff.entity) {
    case "task":
      applyTaskDiff(diff);
      break;
    case "project":
      applyProjectDiff(diff);
      break;
    case "column":
      applyColumnDiff(diff);
      break;
    default:
      console.warn(`[Sync] Unknown entity type: ${diff.entity}`);
  }
}

/**
 * Applies an array of pull diffs to the local database.
 * Returns the highest applied version.
 */
export function applyPullDiffs(diffs: PullDiffItem[]): number {
  const db = getDatabase();
  let maxVersion = 0;

  const transaction = db.transaction(() => {
    for (const pullDiff of diffs) {
      applyDiff(pullDiff.data);

      // Log as synced remote change
      logChange({
        entity_type: pullDiff.data.entity as "project" | "task" | "column",
        entity_id: pullDiff.data.entityId,
        action: pullDiff.data.action as "create" | "update" | "delete",
        field: pullDiff.data.field,
        old_value: pullDiff.data.oldValue != null ? JSON.stringify(pullDiff.data.oldValue) : null,
        new_value: pullDiff.data.newValue != null ? JSON.stringify(pullDiff.data.newValue) : null,
        synced: 1,
        user_id: "remote",
        device_id: "remote",
      });

      if (pullDiff.appliedVersion > maxVersion) {
        maxVersion = pullDiff.appliedVersion;
      }
    }
  });

  transaction();
  return maxVersion;
}

// ── Entity-specific diff handlers ───────────────────────

function applyTaskDiff(diff: DiffData): void {
  const db = getDatabase();

  switch (diff.action) {
    case "create": {
      const newVal = diff.newValue as Record<string, unknown> | null;
      if (!newVal) return;

      const existing = db.prepare("SELECT id FROM tasks WHERE id = ?").get(diff.entityId);
      if (existing) {
        // Already exists, treat as update
        applyTaskUpdate(db, diff.entityId, newVal);
        return;
      }

      const projectId = (newVal.project_id ?? newVal.projectId ?? "") as string;
      const status = (newVal.status ?? "backlog") as string;

      const maxOrder = (
        db.prepare(
          "SELECT MAX(sort_order) as m FROM tasks WHERE project_id = ? AND status = ?"
        ).get(projectId, status) as { m: number | null }
      ).m ?? -1;

      db.prepare(
        `INSERT INTO tasks
          (id, project_id, status, title, description, priority, avatar, avatar_color,
           due_date, due_time, duration, progress, tags, checklist, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        diff.entityId,
        projectId,
        status,
        newVal.title ?? "Untitled",
        newVal.description ?? newVal.desc ?? "",
        newVal.priority ?? "medium",
        newVal.avatar ?? "",
        newVal.avatar_color ?? newVal.avatarColor ?? "blue",
        newVal.due_date ?? newVal.dueDate ?? null,
        newVal.due_time ?? newVal.dueTime ?? null,
        newVal.duration ?? null,
        newVal.progress ?? 0,
        typeof newVal.tags === "string" ? newVal.tags : JSON.stringify(newVal.tags ?? []),
        typeof newVal.checklist === "string" ? newVal.checklist : JSON.stringify(newVal.checklist ?? []),
        maxOrder + 1,
        newVal.created_at ?? new Date().toISOString(),
        new Date().toISOString()
      );
      break;
    }

    case "update": {
      if (!diff.field) return;
      const updateMap: Record<string, string> = {
        title: "title",
        description: "description",
        desc: "description",
        priority: "priority",
        avatar: "avatar",
        avatar_color: "avatar_color",
        avatarColor: "avatar_color",
        due_date: "due_date",
        dueDate: "due_date",
        due_time: "due_time",
        dueTime: "due_time",
        duration: "duration",
        progress: "progress",
        tags: "tags",
        checklist: "checklist",
        status: "status",
      };

      const dbField = updateMap[diff.field];
      if (!dbField) {
        console.warn(`[Sync] Unknown task field: ${diff.field}`);
        return;
      }

      let value = diff.newValue;
      if (dbField === "tags" || dbField === "checklist") {
        value = typeof value === "string" ? value : JSON.stringify(value ?? []);
      }

      db.prepare(
        `UPDATE tasks SET ${dbField} = ?, updated_at = ? WHERE id = ?`
      ).run(value, new Date().toISOString(), diff.entityId);
      break;
    }

    case "delete": {
      db.prepare("DELETE FROM tasks WHERE id = ?").run(diff.entityId);
      break;
    }
  }
}

function applyTaskUpdate(db: ReturnType<typeof getDatabase>, taskId: string, data: Record<string, unknown>): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  const mapping: Record<string, string> = {
    title: "title",
    description: "description",
    desc: "description",
    priority: "priority",
    avatar: "avatar",
    avatar_color: "avatar_color",
    avatarColor: "avatar_color",
    due_date: "due_date",
    dueDate: "due_date",
    due_time: "due_time",
    dueTime: "due_time",
    duration: "duration",
    progress: "progress",
    status: "status",
    project_id: "project_id",
    projectId: "project_id",
  };

  for (const [key, val] of Object.entries(data)) {
    const dbField = mapping[key];
    if (dbField && !fields.includes(dbField)) {
      fields.push(`${dbField} = ?`);
      values.push(val);
    }
  }

  if (data.tags !== undefined) {
    fields.push("tags = ?");
    values.push(typeof data.tags === "string" ? data.tags : JSON.stringify(data.tags));
  }
  if (data.checklist !== undefined) {
    fields.push("checklist = ?");
    values.push(typeof data.checklist === "string" ? data.checklist : JSON.stringify(data.checklist));
  }

  if (fields.length === 0) return;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(taskId);

  db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);
}

function applyProjectDiff(diff: DiffData): void {
  const db = getDatabase();

  switch (diff.action) {
    case "create": {
      const newVal = diff.newValue as Record<string, unknown> | null;
      if (!newVal) return;

      const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(diff.entityId);
      if (existing) {
        db.prepare(
          "UPDATE projects SET name = ?, color = ?, updated_at = ? WHERE id = ?"
        ).run(
          newVal.name ?? "Unnamed",
          newVal.color ?? "orange",
          new Date().toISOString(),
          diff.entityId
        );
        return;
      }

      const maxOrder = (
        db.prepare("SELECT MAX(sort_order) as m FROM projects").get() as { m: number | null }
      ).m ?? -1;

      db.prepare(
        `INSERT INTO projects (id, name, color, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        diff.entityId,
        newVal.name ?? "Unnamed",
        newVal.color ?? "orange",
        maxOrder + 1,
        newVal.created_at as string ?? new Date().toISOString(),
        new Date().toISOString()
      );
      break;
    }

    case "update": {
      if (!diff.field) return;
      const fieldMap: Record<string, string> = { name: "name", color: "color" };
      const dbField = fieldMap[diff.field];
      if (!dbField) return;

      db.prepare(
        `UPDATE projects SET ${dbField} = ?, updated_at = ? WHERE id = ?`
      ).run(diff.newValue, new Date().toISOString(), diff.entityId);
      break;
    }

    case "delete": {
      db.prepare("DELETE FROM projects WHERE id = ?").run(diff.entityId);
      break;
    }
  }
}

function applyColumnDiff(diff: DiffData): void {
  const db = getDatabase();

  switch (diff.action) {
    case "create": {
      const newVal = diff.newValue as Record<string, unknown> | null;
      if (!newVal) return;

      const projectId = (newVal.project_id ?? newVal.projectId ?? "") as string;
      const existing = db
        .prepare("SELECT id FROM columns WHERE id = ? AND project_id = ?")
        .get(diff.entityId, projectId);

      if (existing) {
        db.prepare(
          "UPDATE columns SET label = ?, is_done = ? WHERE id = ? AND project_id = ?"
        ).run(
          newVal.label ?? "Column",
          newVal.is_done ?? newVal.isDone ?? 0,
          diff.entityId,
          projectId
        );
        return;
      }

      const maxOrder = (
        db.prepare("SELECT MAX(sort_order) as m FROM columns WHERE project_id = ?")
          .get(projectId) as { m: number | null }
      ).m ?? -1;

      db.prepare(
        `INSERT INTO columns (id, project_id, label, is_done, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        diff.entityId,
        projectId,
        newVal.label ?? "Column",
        newVal.is_done ?? newVal.isDone ?? 0,
        maxOrder + 1,
        new Date().toISOString()
      );
      break;
    }

    case "update": {
      if (!diff.field) return;
      const fieldMap: Record<string, string> = { label: "label", is_done: "is_done", isDone: "is_done" };
      const dbField = fieldMap[diff.field];
      if (!dbField) return;

      // Column has composite PK (id, project_id), so we update all matching
      db.prepare(
        `UPDATE columns SET ${dbField} = ? WHERE id = ?`
      ).run(diff.newValue, diff.entityId);
      break;
    }

    case "delete": {
      // Move tasks to backlog before deleting column
      const cols = db
        .prepare("SELECT project_id FROM columns WHERE id = ?")
        .all(diff.entityId) as { project_id: string }[];

      for (const col of cols) {
        db.prepare(
          "UPDATE tasks SET status = 'backlog' WHERE project_id = ? AND status = ?"
        ).run(col.project_id, diff.entityId);
      }

      db.prepare("DELETE FROM columns WHERE id = ?").run(diff.entityId);
      break;
    }
  }
}
