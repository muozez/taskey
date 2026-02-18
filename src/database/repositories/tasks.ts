import { getDatabase } from "../index";
import { logChange, logFieldChanges } from "./changelog";

export interface TaskRow {
  id: string;
  project_id: string;
  status: string;
  title: string;
  description: string;
  priority: string;
  avatar: string;
  avatar_color: string;
  due_date: string | null;
  due_time: string | null;
  duration: string | null;
  progress: number;
  tags: string; // JSON array
  checklist: string; // JSON array
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Shape matching the renderer's in-memory format
export interface TaskData {
  id: string;
  title: string;
  desc: string;
  priority: string;
  avatar: string;
  avatarColor: string;
  dueDate: string;
  dueTime: string;
  duration: string;
  progress: number;
  tags: string[];
  checklist: { text: string; done: boolean }[];
  createdAt: string;
}

/**
 * Converts a DB row to the renderer-friendly task shape.
 */
function rowToTask(row: TaskRow): TaskData {
  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    priority: row.priority,
    avatar: row.avatar,
    avatarColor: row.avatar_color,
    dueDate: row.due_date ?? "",
    dueTime: row.due_time ?? "",
    duration: row.duration ?? "",
    progress: row.progress,
    tags: JSON.parse(row.tags || "[]"),
    checklist: JSON.parse(row.checklist || "[]"),
    createdAt: row.created_at,
  };
}

/**
 * Get all tasks for a project, organized by status.
 * Returns a map: { 'backlog': [...], 'in-progress': [...], ... }
 */
export function getTasksByProject(
  projectId: string
): Record<string, TaskData[]> {
  const db = getDatabase();
  const rows = db
    .prepare(
      "SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC"
    )
    .all(projectId) as TaskRow[];

  const result: Record<string, TaskData[]> = {};
  for (const row of rows) {
    if (!result[row.status]) {
      result[row.status] = [];
    }
    result[row.status].push(rowToTask(row));
  }
  return result;
}

/**
 * Get a single task by ID.
 */
export function getTask(taskId: string): (TaskData & { projectId: string; status: string }) | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as TaskRow | undefined;
  if (!row) return null;
  return { ...rowToTask(row), projectId: row.project_id, status: row.status };
}

/**
 * Get all tasks across all projects (for dashboard).
 */
export function getAllTasks(): (TaskData & { projectId: string; status: string })[] {
  const db = getDatabase();
  const rows = db
    .prepare("SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC")
    .all() as TaskRow[];

  return rows.map((row) => ({
    ...rowToTask(row),
    projectId: row.project_id,
    status: row.status,
  }));
}

/**
 * Validates that the given status is a valid column for the project.
 * Returns true if the status is 'backlog' or matches a known column id.
 */
function isValidStatus(db: ReturnType<typeof getDatabase>, projectId: string, status: string): boolean {
  if (status === 'backlog') return true;
  const col = db
    .prepare("SELECT 1 FROM columns WHERE project_id = ? AND id = ?")
    .get(projectId, status);
  return !!col;
}

/**
 * Create a new task.
 */
export function createTask(
  projectId: string,
  status: string,
  data: Partial<TaskData> & { id: string; title: string }
): TaskData {
  const db = getDatabase();

  if (!isValidStatus(db, projectId, status)) {
    throw new Error(`Invalid status "${status}" for project "${projectId}"`);
  }

  const now = new Date().toISOString();

  const maxOrder = (
    db
      .prepare(
        "SELECT MAX(sort_order) as m FROM tasks WHERE project_id = ? AND status = ?"
      )
      .get(projectId, status) as { m: number | null }
  ).m ?? -1;

  const tags = JSON.stringify(data.tags ?? []);
  const checklist = JSON.stringify(data.checklist ?? []);

  db.prepare(
    `INSERT INTO tasks
      (id, project_id, status, title, description, priority, avatar, avatar_color,
       due_date, due_time, duration, progress, tags, checklist, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.id,
    projectId,
    status,
    data.title,
    data.desc ?? "",
    data.priority ?? "medium",
    data.avatar ?? "",
    data.avatarColor ?? "blue",
    data.dueDate || null,
    data.dueTime || null,
    data.duration || null,
    data.progress ?? 0,
    tags,
    checklist,
    maxOrder + 1,
    data.createdAt ?? now,
    now
  );

  logChange({
    entity_type: "task",
    entity_id: data.id,
    project_id: projectId,
    action: "create",
    new_value: JSON.stringify({
      title: data.title,
      status,
      priority: data.priority ?? "medium",
    }),
  });

  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(data.id) as TaskRow;
  return rowToTask(row);
}

/**
 * Update an existing task. Logs field-level changes.
 */
export function updateTask(
  taskId: string,
  updates: Partial<TaskData> & { status?: string }
): TaskData | null {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as TaskRow | undefined;
  if (!existing) return null;

  const now = new Date().toISOString();

  const newTitle = updates.title ?? existing.title;
  const newDesc = updates.desc ?? existing.description;
  const newPriority = updates.priority ?? existing.priority;
  const newAvatar = updates.avatar ?? existing.avatar;
  const newAvatarColor = updates.avatarColor ?? existing.avatar_color;
  const newDueDate = updates.dueDate !== undefined ? (updates.dueDate || null) : existing.due_date;
  const newDueTime = updates.dueTime !== undefined ? (updates.dueTime || null) : existing.due_time;
  const newDuration = updates.duration !== undefined ? (updates.duration || null) : existing.duration;
  const newProgress = updates.progress ?? existing.progress;
  const newTags = updates.tags !== undefined ? JSON.stringify(updates.tags) : existing.tags;
  const newChecklist = updates.checklist !== undefined ? JSON.stringify(updates.checklist) : existing.checklist;
  const newStatus = updates.status ?? existing.status;

  // Build old/new objects for field-level diffing
  const oldObj: Record<string, unknown> = {
    title: existing.title,
    description: existing.description,
    priority: existing.priority,
    avatar: existing.avatar,
    avatar_color: existing.avatar_color,
    due_date: existing.due_date,
    due_time: existing.due_time,
    duration: existing.duration,
    progress: existing.progress,
    tags: existing.tags,
    checklist: existing.checklist,
    status: existing.status,
  };

  const newObj: Record<string, unknown> = {
    title: newTitle,
    description: newDesc,
    priority: newPriority,
    avatar: newAvatar,
    avatar_color: newAvatarColor,
    due_date: newDueDate,
    due_time: newDueTime,
    duration: newDuration,
    progress: newProgress,
    tags: newTags,
    checklist: newChecklist,
    status: newStatus,
  };

  db.prepare(
    `UPDATE tasks SET
       title = ?, description = ?, priority = ?, avatar = ?, avatar_color = ?,
       due_date = ?, due_time = ?, duration = ?, progress = ?,
       tags = ?, checklist = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    newTitle, newDesc, newPriority, newAvatar, newAvatarColor,
    newDueDate, newDueTime, newDuration, newProgress,
    newTags, newChecklist, newStatus, now,
    taskId
  );

  // Log field-level changes
  logFieldChanges(
    "task",
    taskId,
    existing.project_id,
    oldObj,
    newObj,
    [
      "title", "description", "priority", "avatar", "avatar_color",
      "due_date", "due_time", "duration", "progress", "tags", "checklist", "status",
    ]
  );

  // Special "move" action if status changed
  if (existing.status !== newStatus) {
    logChange({
      entity_type: "task",
      entity_id: taskId,
      project_id: existing.project_id,
      action: "move",
      field: "status",
      old_value: JSON.stringify(existing.status),
      new_value: JSON.stringify(newStatus),
    });
  }

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as TaskRow;
  return rowToTask(updated);
}

/**
 * Move a task to a different status (column).
 */
export function moveTask(
  taskId: string,
  newStatus: string,
  newProgress?: number
): void {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as TaskRow | undefined;
  if (!existing) return;

  if (!isValidStatus(db, existing.project_id, newStatus)) {
    throw new Error(`Invalid status "${newStatus}" for project "${existing.project_id}"`);
  }

  const now = new Date().toISOString();

  const maxOrder = (
    db
      .prepare(
        "SELECT MAX(sort_order) as m FROM tasks WHERE project_id = ? AND status = ?"
      )
      .get(existing.project_id, newStatus) as { m: number | null }
  ).m ?? -1;

  if (newProgress !== undefined) {
    db.prepare(
      "UPDATE tasks SET status = ?, progress = ?, sort_order = ?, updated_at = ? WHERE id = ?"
    ).run(newStatus, newProgress, maxOrder + 1, now, taskId);
  } else {
    db.prepare(
      "UPDATE tasks SET status = ?, sort_order = ?, updated_at = ? WHERE id = ?"
    ).run(newStatus, maxOrder + 1, now, taskId);
  }

  logChange({
    entity_type: "task",
    entity_id: taskId,
    project_id: existing.project_id,
    action: "move",
    field: "status",
    old_value: JSON.stringify(existing.status),
    new_value: JSON.stringify(newStatus),
  });
}

/**
 * Delete a task.
 */
export function deleteTask(taskId: string): void {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as TaskRow | undefined;
  if (!existing) return;

  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);

  logChange({
    entity_type: "task",
    entity_id: taskId,
    project_id: existing.project_id,
    action: "delete",
    old_value: JSON.stringify({
      title: existing.title,
      description: existing.description,
      priority: existing.priority,
      status: existing.status,
      tags: existing.tags,
      checklist: existing.checklist,
    }),
  });
}
