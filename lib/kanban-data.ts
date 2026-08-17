"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { calendarItems, kanbanBoards, kanbanColumns, kanbanLabels, kanbanTaskLabels, kanbanTasks, users } from "@/db/schema";

export type Priority = "low" | "medium" | "high";
export type LabelRecord = { id: number; name: string; color: string };
export type TaskRecord = {
  id: number;
  columnId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: Priority;
  position: number;
  isNotesLinked: boolean;
  isCalendarSynced: boolean;
  labels: LabelRecord[];
};
export type ColumnRecord = { id: number; name: string; position: number; tasks: TaskRecord[] };
export type BoardRecord = { id: number; name: string; color: string; columns: ColumnRecord[]; labels: LabelRecord[] };

async function currentDbUser() {
  const { userId } = await auth();
  if (!userId) throw new Error("Please sign in to manage boards.");

  const existing = await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) });
  if (existing) return existing;

  const clerk = await currentUser();
  const name = clerk ? [clerk.firstName, clerk.lastName].filter(Boolean).join(" ") || clerk.username || null : null;
  const email = clerk?.primaryEmailAddress?.emailAddress ?? null;

  const [created] = await db
    .insert(users)
    .values({ clerkUserId: userId, name, email, imageUrl: clerk?.imageUrl ?? null })
    .returning();

  return created;
}

async function ownedBoard(id: number, userId: number) {
  const board = await db.query.kanbanBoards.findFirst({
    where: and(eq(kanbanBoards.id, id), eq(kanbanBoards.userId, userId)),
  });
  if (!board) throw new Error("Board not found.");
  return board;
}

async function ownedColumn(id: number, userId: number) {
  const row = await db
    .select({ column: kanbanColumns, board: kanbanBoards })
    .from(kanbanColumns)
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(and(eq(kanbanColumns.id, id), eq(kanbanBoards.userId, userId)))
    .limit(1);
  if (!row[0]) throw new Error("Column not found.");
  return row[0];
}

function mapTask(task: typeof kanbanTasks.$inferSelect, labels: LabelRecord[]): TaskRecord {
  return {
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority as Priority,
    position: task.position,
    isNotesLinked: task.isNotesLinked,
    isCalendarSynced: task.calendarItemId !== null,
    labels,
  };
}

export async function getKanbanData(): Promise<BoardRecord[]> {
  const user = await currentDbUser();
  const boards = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.userId, user.id))
    .orderBy(asc(kanbanBoards.createdAt));

  if (!boards.length) return [];

  const boardIds = boards.map((board) => board.id);
  const [columns, labels, tasks, links] = await Promise.all([
    db
      .select()
      .from(kanbanColumns)
      .where(inArray(kanbanColumns.boardId, boardIds))
      .orderBy(asc(kanbanColumns.position)),
    db
      .select()
      .from(kanbanLabels)
      .where(inArray(kanbanLabels.boardId, boardIds))
      .orderBy(asc(kanbanLabels.name)),
    db
      .select()
      .from(kanbanTasks)
      .where(inArray(kanbanTasks.boardId, boardIds))
      .orderBy(asc(kanbanTasks.columnId), asc(kanbanTasks.position)),
    db
      .select({ taskId: kanbanTaskLabels.taskId, label: kanbanLabels })
      .from(kanbanTaskLabels)
      .innerJoin(kanbanLabels, eq(kanbanTaskLabels.labelId, kanbanLabels.id))
      .where(inArray(kanbanLabels.boardId, boardIds)),
  ]);

  const taskLabels = new Map<number, LabelRecord[]>();
  for (const { taskId, label } of links) {
    const current = taskLabels.get(taskId) ?? [];
    current.push({ id: label.id, name: label.name, color: label.color });
    taskLabels.set(taskId, current);
  }

  return boards.map((board) => {
    const boardColumns = columns.filter((column) => column.boardId === board.id);
    const boardLabels = labels
      .filter((label) => label.boardId === board.id)
      .map((label) => ({ id: label.id, name: label.name, color: label.color }));

    return {
      id: board.id,
      name: board.name,
      color: board.color,
      labels: boardLabels,
      columns: boardColumns.map((column) => ({
        id: column.id,
        name: column.name,
        position: column.position,
        tasks: tasks
          .filter((task) => task.columnId === column.id)
          .map((task) => mapTask(task, taskLabels.get(task.id) ?? [])),
      })),
    };
  });
}

export async function createKanbanBoard(input: { name: string; color: string }): Promise<BoardRecord> {
  const user = await currentDbUser();
  const name = input.name.trim();
  if (!name) throw new Error("A board name is required.");

  const [board] = await db
    .insert(kanbanBoards)
    .values({ userId: user.id, name, color: input.color })
    .returning();

  const columns = await db
    .insert(kanbanColumns)
    .values(["Todo", "In Progress", "Done"].map((columnName, position) => ({ boardId: board.id, name: columnName, position })))
    .returning();

  return {
    id: board.id,
    name: board.name,
    color: board.color,
    labels: [],
    columns: columns.map((column) => ({ id: column.id, name: column.name, position: column.position, tasks: [] })),
  };
}

export async function createKanbanColumn(boardId: number, name: string) {
  const user = await currentDbUser();
  await ownedBoard(boardId, user.id);

  const clean = name.trim();
  if (!clean) throw new Error("A column name is required.");

  const rows = await db
    .select({ id: kanbanColumns.id, position: kanbanColumns.position })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, boardId));

  if (rows.length >= 5) throw new Error("A board can have up to five columns.");
  const nextPosition = rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;

  const [column] = await db
    .insert(kanbanColumns)
    .values({ boardId, name: clean, position: nextPosition })
    .returning();

  return { id: column.id, name: column.name, position: column.position, tasks: [] } satisfies ColumnRecord;
}

export async function updateKanbanColumn(columnId: number, name: string) {
  const user = await currentDbUser();
  await ownedColumn(columnId, user.id);

  const clean = name.trim();
  if (!clean) throw new Error("A column name is required.");

  const [column] = await db
    .update(kanbanColumns)
    .set({ name: clean, updatedAt: new Date() })
    .where(eq(kanbanColumns.id, columnId))
    .returning();

  return { id: column.id, name: column.name, position: column.position };
}

export async function moveKanbanColumn(columnId: number, targetColumnId: number) {
  const user = await currentDbUser();
  const [current, target] = await Promise.all([ownedColumn(columnId, user.id), ownedColumn(targetColumnId, user.id)]);
  if (current.column.id === target.column.id) {
    return [{ id: current.column.id, position: current.column.position }];
  }
  if (current.column.boardId !== target.column.boardId) {
    throw new Error("Columns can only move within their board.");
  }

  const columns = await db
    .select({ id: kanbanColumns.id, position: kanbanColumns.position })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, current.column.boardId))
    .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));

  const sourceIndex = columns.findIndex((column) => column.id === current.column.id);
  const targetIndex = columns.findIndex((column) => column.id === target.column.id);
  if (sourceIndex === -1 || targetIndex === -1) throw new Error("Column not found.");

  const reordered = [...columns];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);

  const updates: Array<{ id: number; position: number }> = [];
  for (const [position, column] of reordered.entries()) {
    if (column.position !== position) {
      await db
        .update(kanbanColumns)
        .set({ position, updatedAt: new Date() })
        .where(eq(kanbanColumns.id, column.id));
    }
    updates.push({ id: column.id, position });
  }

  return updates;
}

export async function deleteKanbanColumn(columnId: number) {
  const user = await currentDbUser();
  const { column } = await ownedColumn(columnId, user.id);

  const allColumns = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, column.boardId))
    .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));

  if (allColumns.length <= 1) throw new Error("A board needs at least one column.");

  const firstExisting = allColumns[0];
  const targetColumn =
    firstExisting.id !== column.id ? firstExisting : allColumns.find((entry) => entry.id !== column.id);
  if (!targetColumn) throw new Error("A board needs at least one column.");

  const targetStats = await db
    .select({ maxPosition: sql<number>`coalesce(max(${kanbanTasks.position}), -1)` })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, targetColumn.id));
  let nextPosition = targetStats[0]?.maxPosition ?? -1;

  const movedTasks = await db
    .select()
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId))
    .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.id));

  for (const task of movedTasks) {
    nextPosition += 1;
    await db
      .update(kanbanTasks)
      .set({ columnId: targetColumn.id, position: nextPosition, updatedAt: new Date() })
      .where(eq(kanbanTasks.id, task.id));
  }

  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));

  const remaining = await db
    .select({ id: kanbanColumns.id })
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, column.boardId))
    .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id));

  for (const [position, row] of remaining.entries()) {
    await db
      .update(kanbanColumns)
      .set({ position, updatedAt: new Date() })
      .where(eq(kanbanColumns.id, row.id));
  }

  return { targetColumnId: targetColumn.id, deletedId: columnId };
}

export async function createKanbanLabel(boardId: number, input: { name: string; color: string }) {
  const user = await currentDbUser();
  await ownedBoard(boardId, user.id);

  const name = input.name.trim();
  if (!name) throw new Error("A label name is required.");

  const [label] = await db
    .insert(kanbanLabels)
    .values({ boardId, name, color: input.color })
    .returning();

  return { id: label.id, name: label.name, color: label.color } satisfies LabelRecord;
}

type TaskInput = {
  title: string;
  description?: string;
  dueDate?: string | null;
  priority: Priority;
  labelIds: number[];
  syncCalendar: boolean;
  isNotesLinked: boolean;
};

async function checkLabels(boardId: number, labelIds: number[]) {
  if (!labelIds.length) return;
  const uniqueIds = [...new Set(labelIds)];
  const labels = await db
    .select({ id: kanbanLabels.id })
    .from(kanbanLabels)
    .where(and(eq(kanbanLabels.boardId, boardId), inArray(kanbanLabels.id, uniqueIds)));
  if (labels.length !== uniqueIds.length) throw new Error("One or more labels are invalid.");
}

async function saveCalendar(userId: number, calendarId: number | null, input: TaskInput) {
  if (!input.syncCalendar) {
    if (calendarId) {
      await db
        .delete(calendarItems)
        .where(and(eq(calendarItems.id, calendarId), eq(calendarItems.userId, userId)));
    }
    return null;
  }

  const values = {
    title: input.title.trim(),
    notes: input.description?.trim() || null,
    scheduledDate: input.dueDate || null,
    kind: "task",
    isDraft: false,
    updatedAt: new Date(),
  } as const;

  if (calendarId) {
    const [updated] = await db
      .update(calendarItems)
      .set(values)
      .where(and(eq(calendarItems.id, calendarId), eq(calendarItems.userId, userId)))
      .returning();
    if (updated) return updated.id;
  }

  const [created] = await db.insert(calendarItems).values({ userId, ...values }).returning();
  return created.id;
}

async function taskRecord(task: typeof kanbanTasks.$inferSelect): Promise<TaskRecord> {
  const labels = await db
    .select({ label: kanbanLabels })
    .from(kanbanTaskLabels)
    .innerJoin(kanbanLabels, eq(kanbanTaskLabels.labelId, kanbanLabels.id))
    .where(eq(kanbanTaskLabels.taskId, task.id));
  return mapTask(
    task,
    labels.map(({ label }) => ({ id: label.id, name: label.name, color: label.color })),
  );
}

export async function createKanbanTask(columnId: number, input: TaskInput) {
  const user = await currentDbUser();
  const { column } = await ownedColumn(columnId, user.id);

  const title = input.title.trim();
  if (!title) throw new Error("A task title is required.");

  await checkLabels(column.boardId, input.labelIds);

  const existing = await db
    .select({ position: kanbanTasks.position })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId))
    .orderBy(desc(kanbanTasks.position))
    .limit(1);

  const calendarItemId = await saveCalendar(user.id, null, input);
  const [task] = await db
    .insert(kanbanTasks)
    .values({
      boardId: column.boardId,
      columnId,
      title,
      description: input.description?.trim() || null,
      dueDate: input.dueDate || null,
      priority: input.priority,
      isNotesLinked: input.isNotesLinked,
      calendarItemId,
      position: (existing[0]?.position ?? -1) + 1,
    })
    .returning();

  if (input.labelIds.length) {
    await db.insert(kanbanTaskLabels).values(
      [...new Set(input.labelIds)].map((labelId) => ({
        taskId: task.id,
        labelId,
      })),
    );
  }

  return taskRecord(task);
}

export async function updateKanbanTask(taskId: number, input: TaskInput) {
  const user = await currentDbUser();
  const rows = await db
    .select({ task: kanbanTasks, board: kanbanBoards })
    .from(kanbanTasks)
    .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanBoards.userId, user.id)))
    .limit(1);
  if (!rows[0]) throw new Error("Task not found.");

  const { task, board } = rows[0];
  const title = input.title.trim();
  if (!title) throw new Error("A task title is required.");

  await checkLabels(board.id, input.labelIds);
  const calendarItemId = await saveCalendar(user.id, task.calendarItemId, input);

  const [updated] = await db
    .update(kanbanTasks)
    .set({
      title,
      description: input.description?.trim() || null,
      dueDate: input.dueDate || null,
      priority: input.priority,
      isNotesLinked: input.isNotesLinked,
      calendarItemId,
      updatedAt: new Date(),
    })
    .where(eq(kanbanTasks.id, taskId))
    .returning();

  await db.delete(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, taskId));
  if (input.labelIds.length) {
    await db.insert(kanbanTaskLabels).values(
      [...new Set(input.labelIds)].map((labelId) => ({
        taskId,
        labelId,
      })),
    );
  }

  return taskRecord(updated);
}

export async function deleteKanbanTask(taskId: number) {
  const user = await currentDbUser();
  const rows = await db
    .select({ task: kanbanTasks, board: kanbanBoards })
    .from(kanbanTasks)
    .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanBoards.userId, user.id)))
    .limit(1);
  if (!rows[0]) throw new Error("Task not found.");

  if (rows[0].task.calendarItemId) {
    await db
      .delete(calendarItems)
      .where(and(eq(calendarItems.id, rows[0].task.calendarItemId), eq(calendarItems.userId, user.id)));
  }

  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));
}

export async function moveKanbanTask(taskId: number, columnId: number) {
  const user = await currentDbUser();
  const taskRows = await db
    .select({ task: kanbanTasks, board: kanbanBoards })
    .from(kanbanTasks)
    .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanBoards.userId, user.id)))
    .limit(1);
  if (!taskRows[0]) throw new Error("Task not found.");

  const { task, board } = taskRows[0];
  const { column } = await ownedColumn(columnId, user.id);
  if (column.boardId !== board.id) throw new Error("Tasks can only move within their board.");

  const last = await db
    .select({ position: kanbanTasks.position })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId))
    .orderBy(desc(kanbanTasks.position))
    .limit(1);

  const [updated] = await db
    .update(kanbanTasks)
    .set({ columnId, position: (last[0]?.position ?? -1) + 1, updatedAt: new Date() })
    .where(eq(kanbanTasks.id, task.id))
    .returning();

  return taskRecord(updated);
}
