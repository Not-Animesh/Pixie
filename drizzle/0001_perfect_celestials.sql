CREATE TABLE "kanban_boards" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "kanban_boards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "kanban_columns" (
  "id" serial PRIMARY KEY NOT NULL,
  "board_id" integer NOT NULL,
  "name" text NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "kanban_columns_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "kanban_labels" (
  "id" serial PRIMARY KEY NOT NULL,
  "board_id" integer NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "kanban_labels_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "kanban_tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "board_id" integer NOT NULL,
  "column_id" integer NOT NULL,
  "calendar_item_id" integer,
  "title" text NOT NULL,
  "description" text,
  "due_date" date,
  "priority" text DEFAULT 'medium' NOT NULL,
  "is_notes_linked" boolean DEFAULT false NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "kanban_tasks_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "kanban_tasks_column_id_kanban_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."kanban_columns"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "kanban_tasks_calendar_item_id_calendar_items_id_fk" FOREIGN KEY ("calendar_item_id") REFERENCES "public"."calendar_items"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "kanban_task_labels" (
  "task_id" integer NOT NULL,
  "label_id" integer NOT NULL,
  CONSTRAINT "kanban_task_labels_task_id_label_id_pk" PRIMARY KEY("task_id","label_id"),
  CONSTRAINT "kanban_task_labels_task_id_kanban_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kanban_tasks"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "kanban_task_labels_label_id_kanban_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."kanban_labels"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "kanban_columns_board_position_unique" ON "kanban_columns" USING btree ("board_id","position");
--> statement-breakpoint
CREATE UNIQUE INDEX "kanban_labels_board_name_unique" ON "kanban_labels" USING btree ("board_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "kanban_tasks_column_position_unique" ON "kanban_tasks" USING btree ("column_id","position");
