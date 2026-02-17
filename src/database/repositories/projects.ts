import { getDatabase } from "../index";
import { logChange, logFieldChanges } from "./changelog";

export interface ProjectRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnRow {
  id: string;
  project_id: string;
  label: string;
  is_done: number;
  sort_order: number;
  created_at: string;
}

// Shape returned to the renderer (matching the existing in-memory format)
export interface ProjectWithColumns {
  id: string;
  name: string;
  color: string;
  columns: { id: string; label: string; isDone?: boolean }[];
}

/**
 * Get all projects with their columns.
 */
export function getAllProjects(): ProjectWithColumns[] {
  const db = getDatabase();
  const projects = db
    .prepare("SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC")
    .all() as ProjectRow[];

  return projects.map((p) => {
    const columns = db
      .prepare(
        "SELECT * FROM columns WHERE project_id = ? ORDER BY sort_order ASC"
      )
      .all(p.id) as ColumnRow[];

    return {
      id: p.id,
      name: p.name,
      color: p.color,
      columns: columns.map((c) => ({
        id: c.id,
        label: c.label,
        isDone: c.is_done === 1 ? true : undefined,
      })),
    };
  });
}

/**
 * Get a single project with its columns.
 */
export function getProject(projectId: string): ProjectWithColumns | null {
  const db = getDatabase();
  const p = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(projectId) as ProjectRow | undefined;
  if (!p) return null;

  const columns = db
    .prepare(
      "SELECT * FROM columns WHERE project_id = ? ORDER BY sort_order ASC"
    )
    .all(p.id) as ColumnRow[];

  return {
    id: p.id,
    name: p.name,
    color: p.color,
    columns: columns.map((c) => ({
      id: c.id,
      label: c.label,
      isDone: c.is_done === 1 ? true : undefined,
    })),
  };
}

/**
 * Create a new project with its columns.
 */
export function createProject(
  id: string,
  name: string,
  color: string,
  columns: { id: string; label: string; isDone?: boolean }[]
): ProjectWithColumns {
  const db = getDatabase();
  const now = new Date().toISOString();

  const maxOrder = (
    db
      .prepare("SELECT MAX(sort_order) as m FROM projects")
      .get() as { m: number | null }
  ).m ?? -1;

  const insertProject = db.prepare(
    `INSERT INTO projects (id, name, color, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertColumn = db.prepare(
    `INSERT INTO columns (id, project_id, label, is_done, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    insertProject.run(id, name, color, maxOrder + 1, now, now);

    columns.forEach((col, idx) => {
      insertColumn.run(col.id, id, col.label, col.isDone ? 1 : 0, idx, now);
    });

    // Log creation
    logChange({
      entity_type: "project",
      entity_id: id,
      project_id: id,
      action: "create",
      new_value: JSON.stringify({ name, color, columns }),
    });
  });

  transaction();

  return { id, name, color, columns };
}

/**
 * Update a project's basic info (name, color).
 */
export function updateProject(
  projectId: string,
  updates: { name?: string; color?: string }
): void {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(projectId) as ProjectRow | undefined;
  if (!existing) return;

  const newName = updates.name ?? existing.name;
  const newColor = updates.color ?? existing.color;
  const now = new Date().toISOString();

  db.prepare(
    "UPDATE projects SET name = ?, color = ?, updated_at = ? WHERE id = ?"
  ).run(newName, newColor, now, projectId);

  // Log field-level changes
  logFieldChanges(
    "project",
    projectId,
    projectId,
    { name: existing.name, color: existing.color },
    { name: newName, color: newColor },
    ["name", "color"]
  );
}

/**
 * Delete a project and all its data (tasks, columns cascade).
 */
export function deleteProject(projectId: string): void {
  const db = getDatabase();

  // Capture snapshot for change log
  const existing = db
    .prepare("SELECT * FROM projects WHERE id = ?")
    .get(projectId) as ProjectRow | undefined;
  if (!existing) return;

  const transaction = db.transaction(() => {
    // Log deletion of all tasks in project
    const tasks = db
      .prepare("SELECT id, title FROM tasks WHERE project_id = ?")
      .all(projectId) as { id: string; title: string }[];

    for (const task of tasks) {
      logChange({
        entity_type: "task",
        entity_id: task.id,
        project_id: projectId,
        action: "delete",
        old_value: JSON.stringify({ title: task.title }),
      });
    }

    // Delete project (cascades to columns and tasks)
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);

    logChange({
      entity_type: "project",
      entity_id: projectId,
      project_id: projectId,
      action: "delete",
      old_value: JSON.stringify({
        name: existing.name,
        color: existing.color,
      }),
    });
  });

  transaction();
}

/**
 * Add a column to a project.
 */
export function addColumn(
  projectId: string,
  columnId: string,
  label: string,
  isDone: boolean = false,
  insertBeforeDone: boolean = true
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const columns = db
    .prepare(
      "SELECT * FROM columns WHERE project_id = ? ORDER BY sort_order ASC"
    )
    .all(projectId) as ColumnRow[];

  let sortOrder: number;

  if (insertBeforeDone) {
    const doneCol = columns.find((c) => c.is_done === 1);
    if (doneCol) {
      sortOrder = doneCol.sort_order;
      // Shift done column(s) forward
      db.prepare(
        "UPDATE columns SET sort_order = sort_order + 1 WHERE project_id = ? AND is_done = 1"
      ).run(projectId);
    } else {
      sortOrder = columns.length;
    }
  } else {
    sortOrder = columns.length;
  }

  db.prepare(
    `INSERT INTO columns (id, project_id, label, is_done, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(columnId, projectId, label, isDone ? 1 : 0, sortOrder, now);

  logChange({
    entity_type: "column",
    entity_id: columnId,
    project_id: projectId,
    action: "create",
    new_value: JSON.stringify({ label, isDone }),
  });
}

/**
 * Rename a column.
 */
export function renameColumn(
  projectId: string,
  columnId: string,
  newLabel: string
): void {
  const db = getDatabase();
  const existing = db
    .prepare("SELECT * FROM columns WHERE id = ? AND project_id = ?")
    .get(columnId, projectId) as ColumnRow | undefined;
  if (!existing) return;

  db.prepare(
    "UPDATE columns SET label = ? WHERE id = ? AND project_id = ?"
  ).run(newLabel, columnId, projectId);

  logChange({
    entity_type: "column",
    entity_id: columnId,
    project_id: projectId,
    action: "update",
    field: "label",
    old_value: JSON.stringify(existing.label),
    new_value: JSON.stringify(newLabel),
  });
}

/**
 * Delete a column. Tasks in the column are moved to backlog.
 */
export function deleteColumn(projectId: string, columnId: string): void {
  const db = getDatabase();

  const transaction = db.transaction(() => {
    // Move tasks to backlog
    const tasks = db
      .prepare(
        "SELECT id FROM tasks WHERE project_id = ? AND status = ?"
      )
      .all(projectId, columnId) as { id: string }[];

    for (const task of tasks) {
      db.prepare("UPDATE tasks SET status = 'backlog' WHERE id = ?").run(
        task.id
      );
      logChange({
        entity_type: "task",
        entity_id: task.id,
        project_id: projectId,
        action: "move",
        field: "status",
        old_value: JSON.stringify(columnId),
        new_value: JSON.stringify("backlog"),
      });
    }

    const existing = db
      .prepare("SELECT * FROM columns WHERE id = ? AND project_id = ?")
      .get(columnId, projectId) as ColumnRow | undefined;

    db.prepare(
      "DELETE FROM columns WHERE id = ? AND project_id = ?"
    ).run(columnId, projectId);

    if (existing) {
      logChange({
        entity_type: "column",
        entity_id: columnId,
        project_id: projectId,
        action: "delete",
        old_value: JSON.stringify({ label: existing.label }),
      });
    }
  });

  transaction();
}
