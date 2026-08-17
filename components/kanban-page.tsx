"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { CalendarDays, CheckSquare2, ChevronRight, GripVertical, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createKanbanBoard,
  createKanbanColumn,
  createKanbanLabel,
  createKanbanTask,
  deleteKanbanColumn,
  deleteKanbanTask,
  moveKanbanColumn,
  moveKanbanTask,
  updateKanbanColumn,
  updateKanbanTask,
  type BoardRecord,
  type ColumnRecord,
  type Priority,
  type TaskRecord,
} from "@/lib/kanban-data";

const palette = ["#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#f97316", "#ec4899"];
const today = () => new Date().toLocaleDateString("en-CA");

type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  labelIds: number[];
  syncCalendar: boolean;
  isNotesLinked: boolean;
};

const blankTask = (): TaskForm => ({
  title: "",
  description: "",
  dueDate: today(),
  priority: "medium",
  labelIds: [],
  syncCalendar: false,
  isNotesLinked: false,
});

const TASK_MIME = "application/x-kanban-task";
const COLUMN_MIME = "application/x-kanban-column";

export function KanbanPage({ initialBoards }: { initialBoards: BoardRecord[] }) {
  const [boards, setBoards] = useState(initialBoards);
  const [selectedId, setSelectedId] = useState(initialBoards[0]?.id ?? null);
  const [boardDialog, setBoardDialog] = useState(false);
  const [columnDialog, setColumnDialog] = useState(false);
  const [taskColumn, setTaskColumn] = useState<number | null>(null);
  const [editing, setEditing] = useState<TaskRecord | null>(null);
  const [error, setError] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<number | null>(null);
  const [columnDropTargetId, setColumnDropTargetId] = useState<number | null>(null);

  const selected = boards.find((board) => board.id === selectedId) ?? null;
  const changeBoard = (id: number, update: (board: BoardRecord) => BoardRecord) =>
    setBoards((items) => items.map((board) => (board.id === id ? update(board) : board)));

  const openTask = (columnId: number, task?: TaskRecord) => {
    setTaskColumn(columnId);
    setEditing(task ?? null);
    setError("");
  };

  const applyColumnPositions = (columns: ColumnRecord[], positions: Array<{ id: number; position: number }>) => {
    const byId = new Map(positions.map((entry) => [entry.id, entry.position]));
    return columns
      .map((column) => ({ ...column, position: byId.get(column.id) ?? column.position }))
      .sort((a, b) => a.position - b.position);
  };

  async function createBoard(input: { name: string; color: string }) {
    try {
      const board = await createKanbanBoard(input);
      setBoards((items) => [...items, board]);
      setSelectedId(board.id);
      setBoardDialog(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create board.");
    }
  }

  async function addColumn(name: string) {
    if (!selected) return;
    try {
      const column = await createKanbanColumn(selected.id, name);
      changeBoard(selected.id, (board) => ({
        ...board,
        columns: [...board.columns, column].sort((a, b) => a.position - b.position),
      }));
      setColumnDialog(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add column.");
    }
  }

  async function renameColumn(column: ColumnRecord) {
    const name = window.prompt("Column name", column.name);
    if (!name?.trim() || !selected) return;
    try {
      const saved = await updateKanbanColumn(column.id, name);
      changeBoard(selected.id, (board) => ({
        ...board,
        columns: board.columns.map((item) => (item.id === saved.id ? { ...item, name: saved.name } : item)),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not rename column.");
    }
  }

  async function removeColumn(column: ColumnRecord) {
    if (!selected || !window.confirm(`Delete “${column.name}”? Its tasks will move to your first board column (Todo).`)) return;
    try {
      const result = await deleteKanbanColumn(column.id);
      changeBoard(selected.id, (board) => {
        const moved = column.tasks.map((task, index) => ({ ...task, columnId: result.targetColumnId, position: 100000 + index }));
        return {
          ...board,
          columns: board.columns
            .filter((item) => item.id !== column.id)
            .map((item) => (item.id === result.targetColumnId ? { ...item, tasks: [...item.tasks, ...moved] } : item))
            .map((item, index) => ({ ...item, position: index })),
        };
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete column.");
    }
  }

  async function saveTask(form: TaskForm, newLabel?: { name: string; color: string }) {
    if (!selected || taskColumn === null) return;
    try {
      let labels = selected.labels;
      let labelIds = form.labelIds;
      if (newLabel?.name.trim()) {
        const created = await createKanbanLabel(selected.id, newLabel);
        labels = [...labels, created];
        labelIds = [...labelIds, created.id];
      }
      const payload = { ...form, dueDate: form.dueDate || null, labelIds };
      const saved = editing ? await updateKanbanTask(editing.id, payload) : await createKanbanTask(taskColumn, payload);
      changeBoard(selected.id, (board) => ({
        ...board,
        labels,
        columns: board.columns.map((column) => ({
          ...column,
          tasks: editing
            ? column.tasks.map((task) => (task.id === saved.id ? saved : task))
            : column.id === taskColumn
              ? [...column.tasks, saved]
              : column.tasks,
        })),
      }));
      setTaskColumn(null);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save task.");
    }
  }

  async function removeTask(task: TaskRecord) {
    if (!selected || !window.confirm(`Delete “${task.title}”?`)) return;
    try {
      await deleteKanbanTask(task.id);
      changeBoard(selected.id, (board) => ({
        ...board,
        columns: board.columns.map((column) => ({ ...column, tasks: column.tasks.filter((item) => item.id !== task.id) })),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task.");
    }
  }

  async function dropTask(columnId: number) {
    if (!selected || draggedTaskId === null) return;
    const source = selected.columns.find((column) => column.tasks.some((task) => task.id === draggedTaskId));
    if (!source || source.id === columnId) {
      setDraggedTaskId(null);
      return;
    }
    try {
      const saved = await moveKanbanTask(draggedTaskId, columnId);
      changeBoard(selected.id, (board) => ({
        ...board,
        columns: board.columns.map((column) =>
          column.id === source.id
            ? { ...column, tasks: column.tasks.filter((task) => task.id !== saved.id) }
            : column.id === columnId
              ? { ...column, tasks: [...column.tasks, saved] }
              : column,
        ),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not move task.");
    } finally {
      setDraggedTaskId(null);
    }
  }

  async function reorderColumns(targetColumnId: number) {
    if (!selected || draggedColumnId === null || draggedColumnId === targetColumnId) return;
    try {
      const positions = await moveKanbanColumn(draggedColumnId, targetColumnId);
      changeBoard(selected.id, (board) => ({ ...board, columns: applyColumnPositions(board.columns, positions) }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reorder columns.");
    } finally {
      setDraggedColumnId(null);
      setColumnDropTargetId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-8 sm:py-7 lg:px-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-400">Organize your focus</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-[-0.035em] text-stone-800 sm:text-[28px]">Task boards</h1>
        </div>
        <button
          onClick={() => {
            setError("");
            setBoardDialog(true);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          New board
        </button>
      </header>

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[255px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-stone-200 bg-[#fffdf9] p-3 shadow-[0_6px_22px_rgba(77,66,52,0.04)]">
          <div className="flex items-center justify-between px-1 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Your boards</h2>
            <CheckSquare2 className="h-4 w-4 text-violet-500" />
          </div>
          <div className="space-y-1">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => setSelectedId(board.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition",
                  selectedId === board.id ? "bg-violet-50 text-violet-800" : "text-stone-600 hover:bg-stone-100",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: board.color }} />
                <span className="min-w-0 flex-1 truncate">{board.name}</span>
                <ChevronRight className={cn("h-3.5 w-3.5", selectedId === board.id ? "text-violet-500" : "text-stone-300")} />
              </button>
            ))}
          </div>
          <button
            onClick={() => setBoardDialog(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-3 py-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Create board
          </button>
        </aside>

        <section className="min-w-0">
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} />
                  <h2 className="text-lg font-bold tracking-[-0.02em] text-stone-800">{selected.name}</h2>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
                    {selected.columns.reduce((count, column) => count + column.tasks.length, 0)} tasks
                  </span>
                </div>
                {selected.columns.length < 5 && (
                  <button
                    onClick={() => {
                      setError("");
                      setColumnDialog(true);
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add column
                  </button>
                )}
              </div>

              <div className="overflow-x-auto pb-3">
                <div className="flex min-w-max gap-4">
                  {selected.columns.map((column) => (
                    <div
                      key={column.id}
                      onDragOver={(event) => {
                        if (!event.dataTransfer.types.includes(COLUMN_MIME)) return;
                        event.preventDefault();
                        setColumnDropTargetId(column.id);
                      }}
                      onDragLeave={() => setColumnDropTargetId((current) => (current === column.id ? null : current))}
                      onDrop={(event) => {
                        if (!event.dataTransfer.types.includes(COLUMN_MIME)) return;
                        event.preventDefault();
                        void reorderColumns(column.id);
                      }}
                      className={cn(
                        "rounded-2xl transition",
                        columnDropTargetId === column.id && draggedColumnId !== null && "ring-2 ring-violet-300 ring-offset-2 ring-offset-[#f8f7f3]",
                      )}
                    >
                      <KanbanColumn
                        column={column}
                        taskDragged={draggedTaskId !== null}
                        onTaskDrop={() => void dropTask(column.id)}
                        onTaskDragStart={(event, id) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(TASK_MIME, String(id));
                          setDraggedTaskId(id);
                        }}
                        onTaskDragEnd={() => setDraggedTaskId(null)}
                        onColumnDragStart={(event, id) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData(COLUMN_MIME, String(id));
                          setDraggedColumnId(id);
                          setColumnDropTargetId(null);
                        }}
                        onColumnDragEnd={() => {
                          setDraggedColumnId(null);
                          setColumnDropTargetId(null);
                        }}
                        onAdd={() => openTask(column.id)}
                        onEdit={(task) => openTask(column.id, task)}
                        onDelete={removeTask}
                        onRename={() => void renameColumn(column)}
                        onDeleteColumn={() => void removeColumn(column)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-8 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm">
                  <CheckSquare2 className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-stone-800">Create your first board</h2>
                <p className="mt-1 max-w-xs text-sm leading-6 text-stone-500">Keep projects calm and visible with columns that match your workflow.</p>
                <button onClick={() => setBoardDialog(true)} className="mt-4 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white">
                  Create board
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {boardDialog && <BoardDialog onClose={() => setBoardDialog(false)} onSubmit={createBoard} />}
      {columnDialog && <NameDialog title="Add column" placeholder="e.g. Review" onClose={() => setColumnDialog(false)} onSubmit={addColumn} />}
      {taskColumn !== null && selected && (
        <TaskDialog
          labels={selected.labels}
          task={editing}
          onClose={() => {
            setTaskColumn(null);
            setEditing(null);
          }}
          onSubmit={saveTask}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  taskDragged,
  onTaskDrop,
  onTaskDragStart,
  onTaskDragEnd,
  onColumnDragStart,
  onColumnDragEnd,
  onAdd,
  onEdit,
  onDelete,
  onRename,
  onDeleteColumn,
}: {
  column: ColumnRecord;
  taskDragged: boolean;
  onTaskDrop: () => void;
  onTaskDragStart: (event: DragEvent<HTMLDivElement>, id: number) => void;
  onTaskDragEnd: () => void;
  onColumnDragStart: (event: DragEvent<HTMLButtonElement>, id: number) => void;
  onColumnDragEnd: () => void;
  onAdd: () => void;
  onEdit: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
  onRename: () => void;
  onDeleteColumn: () => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        if (!taskDragged || !event.dataTransfer.types.includes(TASK_MIME)) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(TASK_MIME)) return;
        setOver(false);
        onTaskDrop();
      }}
      className={cn(
        "w-[285px] shrink-0 rounded-2xl border bg-[#fffdf9] p-3 shadow-[0_4px_16px_rgba(77,66,52,0.035)] transition",
        over ? "border-violet-300 bg-violet-50/60" : "border-stone-200",
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <button
          draggable
          onDragStart={(event) => onColumnDragStart(event, column.id)}
          onDragEnd={onColumnDragEnd}
          aria-label={`Reorder ${column.name}`}
          className="cursor-grab text-stone-400 hover:text-violet-600 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="h-2 w-2 rounded-full bg-violet-400" />
        <h3 className="flex-1 text-sm font-bold text-stone-700">{column.name}</h3>
        <span className="text-[10px] font-semibold text-stone-400">{column.tasks.length}</span>
        <button onClick={onRename} aria-label={`Rename ${column.name}`} className="text-stone-400 hover:text-violet-600">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDeleteColumn} aria-label={`Delete ${column.name}`} className="text-stone-400 hover:text-rose-600">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 min-h-[88px] space-y-2">
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onTaskDragStart}
            onDragEnd={onTaskDragEnd}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        ))}
      </div>
      <button
        onClick={onAdd}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-200 py-2 text-xs font-semibold text-stone-500 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    </div>
  );
}

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
}: {
  task: TaskRecord;
  onDragStart: (event: DragEvent<HTMLDivElement>, id: number) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priority = { low: "bg-sky-50 text-sky-600", medium: "bg-amber-50 text-amber-700", high: "bg-rose-50 text-rose-600" }[task.priority];
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      onDragEnd={onDragEnd}
      className="group cursor-grab rounded-xl border border-stone-100 bg-white p-3 shadow-[0_2px_6px_rgba(77,66,52,0.06)] transition hover:border-violet-100 hover:shadow-sm active:cursor-grabbing"
    >
      <div className="flex gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-3 shrink-0 text-stone-300" />
        <button onClick={onEdit} className="min-w-0 flex-1 text-left text-xs font-semibold leading-5 text-stone-700">
          {task.title}
        </button>
        <div className="hidden gap-1 group-hover:flex">
          <button onClick={onEdit} aria-label="Edit task" className="text-stone-400 hover:text-violet-600">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} aria-label="Delete task" className="text-stone-400 hover:text-rose-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", priority)}>{task.priority}</span>
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-500">
            <CalendarDays className="h-3 w-3 text-violet-500" />
            {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        {task.isCalendarSynced && <CalendarDays className="h-3.5 w-3.5 text-rose-500" aria-label="Synced with Calendar" />}
        {task.isNotesLinked && <Link2 className="h-3.5 w-3.5 text-sky-500" aria-label="Linked to Notes" />}
      </div>
      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span key={label.id} className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `${label.color}1a`, color: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: { name: string; color: string }) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(palette[0]);
  return (
    <Dialog title="Create a board" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ name, color });
        }}
        className="space-y-4"
      >
        <Field label="Board name">
          <input required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Product launch" className="field" />
        </Field>
        <Field label="Board color">
          <div className="flex flex-wrap gap-2">
            {palette.map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setColor(value)}
                aria-label={`Choose ${value}`}
                className={cn("h-7 w-7 rounded-full ring-offset-2", color === value && "ring-2 ring-violet-500")}
                style={{ backgroundColor: value }}
              />
            ))}
          </div>
        </Field>
        <DialogActions onClose={onClose} submit="Create board" />
      </form>
    </Dialog>
  );
}

function NameDialog({ title, placeholder, onClose, onSubmit }: { title: string; placeholder: string; onClose: () => void; onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name);
        }}
      >
        <Field label="Column name">
          <input required autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} className="field" />
        </Field>
        <DialogActions onClose={onClose} submit="Add column" />
      </form>
    </Dialog>
  );
}

function TaskDialog({
  labels,
  task,
  onClose,
  onSubmit,
}: {
  labels: BoardRecord["labels"];
  task: TaskRecord | null;
  onClose: () => void;
  onSubmit: (form: TaskForm, label?: { name: string; color: string }) => void;
}) {
  const [form, setForm] = useState<TaskForm>(() =>
    task
      ? {
          title: task.title,
          description: task.description ?? "",
          dueDate: task.dueDate ?? today(),
          priority: task.priority,
          labelIds: task.labels.map((label) => label.id),
          syncCalendar: task.isCalendarSynced,
          isNotesLinked: task.isNotesLinked,
        }
      : blankTask(),
  );
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(palette[0]);

  const toggle = (id: number) =>
    setForm((value) => ({
      ...value,
      labelIds: value.labelIds.includes(id) ? value.labelIds.filter((item) => item !== id) : [...value.labelIds, id],
    }));

  return (
    <Dialog title={task ? "Edit task" : "Add task"} onClose={onClose} wide>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form, labelName ? { name: labelName, color: labelColor } : undefined);
        }}
        className="space-y-4"
      >
        <Field label="Title">
          <input required autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What needs to happen?" className="field" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="field resize-none" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date">
            <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="field" />
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })} className="field">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
        </div>
        <Field label="Labels">
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <button
                type="button"
                key={label.id}
                onClick={() => toggle(label.id)}
                className={cn("rounded-full border px-2 py-1 text-[10px] font-bold", form.labelIds.includes(label.id) ? "border-transparent" : "border-stone-200 bg-white")}
                style={
                  form.labelIds.includes(label.id)
                    ? { backgroundColor: `${label.color}1a`, color: label.color, borderColor: label.color }
                    : { color: label.color }
                }
              >
                {label.name}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="New shared label" className="field min-w-0 flex-1 !py-1.5 !text-xs" />
            <input type="color" aria-label="New label color" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} className="h-8 w-9 rounded border border-stone-200 p-1" />
          </div>
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            checked={form.syncCalendar}
            onChange={(checked) => setForm({ ...form, syncCalendar: checked })}
            icon={<CalendarDays className="h-4 w-4 text-rose-500" />}
            title="Sync with Calendar"
            description="Create and keep a linked calendar task."
          />
          <Toggle
            checked={form.isNotesLinked}
            onChange={(checked) => setForm({ ...form, isNotesLinked: checked })}
            icon={<Link2 className="h-4 w-4 text-sky-500" />}
            title="Link with Notes"
            description="Save a linked-note marker for later."
          />
        </div>
        <DialogActions onClose={onClose} submit={task ? "Save changes" : "Create task"} />
      </form>
    </Dialog>
  );
}

function Toggle({
  checked,
  onChange,
  icon,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={cn("flex items-center gap-2 rounded-xl border p-2.5 text-left transition", checked ? "border-violet-200 bg-violet-50" : "border-stone-200 bg-white")}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-sm">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-stone-700">{title}</span>
        <span className="block text-[10px] leading-4 text-stone-400">{description}</span>
      </span>
      <span className={cn("h-5 w-9 rounded-full p-0.5 transition", checked ? "bg-violet-600" : "bg-stone-200")}>
        <span className={cn("block h-4 w-4 rounded-full bg-white shadow transition", checked && "translate-x-4")} />
      </span>
    </button>
  );
}

function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/25 p-4">
      <div role="dialog" aria-modal="true" className={cn("mx-auto my-6 w-full rounded-2xl border border-stone-200 bg-[#fffdf9] p-5 shadow-2xl", wide ? "max-w-lg" : "max-w-sm")}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-800">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="icon-button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-stone-600">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function DialogActions({ onClose, submit }: { onClose: () => void; submit: string }) {
  return (
    <div className="mt-5 flex justify-end gap-2 border-t border-stone-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100">
        Cancel
      </button>
      <button className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700">{submit}</button>
    </div>
  );
}
