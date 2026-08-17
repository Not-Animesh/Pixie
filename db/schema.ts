import { boolean, date, integer, pgTable, primaryKey, serial, text, time, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name"),
  email: text("email").unique(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: serial("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("categories_user_name_unique").on(table.userId, table.name)]);

export const calendarItems = pgTable("calendar_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  kind: text("kind").notNull(),
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  isDraft: boolean("is_draft").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const kanbanBoards = pgTable("kanban_boards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(), boardId: integer("board_id").notNull().references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(), position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("kanban_columns_board_position_unique").on(table.boardId, table.position)]);
export const kanbanLabels = pgTable("kanban_labels", {
  id: serial("id").primaryKey(), boardId: integer("board_id").notNull().references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(), color: text("color").notNull(), createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("kanban_labels_board_name_unique").on(table.boardId, table.name)]);
export const kanbanTasks = pgTable("kanban_tasks", {
  id: serial("id").primaryKey(), boardId: integer("board_id").notNull().references(() => kanbanBoards.id, { onDelete: "cascade" }),
  columnId: integer("column_id").notNull().references(() => kanbanColumns.id, { onDelete: "cascade" }),
  calendarItemId: integer("calendar_item_id").references(() => calendarItems.id, { onDelete: "set null" }),
  title: text("title").notNull(), description: text("description"), dueDate: date("due_date"), priority: text("priority").notNull().default("medium"),
  isNotesLinked: boolean("is_notes_linked").notNull().default(false), position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("kanban_tasks_column_position_unique").on(table.columnId, table.position)]);
export const kanbanTaskLabels = pgTable("kanban_task_labels", {
  taskId: integer("task_id").notNull().references(() => kanbanTasks.id, { onDelete: "cascade" }),
  labelId: integer("label_id").notNull().references(() => kanbanLabels.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.taskId, table.labelId] })]);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type KanbanLabel = typeof kanbanLabels.$inferSelect;
export type KanbanTask = typeof kanbanTasks.$inferSelect;
