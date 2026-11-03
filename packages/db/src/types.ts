import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface Database {
  users: UsersTable;
  ai_tasks: AiTasksTable;
}

export interface UsersTable {
  id: Generated<string>;
  email: string;
  name: string;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export interface AiTasksTable {
  id: Generated<string>;
  prompt: string;
  response: string | null;
  model: string;
  status: Generated<TaskStatus>;
  langfuse_trace_id: string | null;
  error_message: string | null;
  created_at: ColumnType<Date, string | undefined, never>;
  updated_at: ColumnType<Date, string | undefined, string>;
}

export type AiTask = Selectable<AiTasksTable>;
export type NewAiTask = Insertable<AiTasksTable>;
export type AiTaskUpdate = Updateable<AiTasksTable>;
