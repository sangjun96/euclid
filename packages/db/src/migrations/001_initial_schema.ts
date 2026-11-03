import { Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  // Enable uuid extension if not present
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`.execute(db);

  // Users table
  await db.schema
    .createTable("users")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // AI Tasks table
  await db.schema
    .createTable("ai_tasks")
    .ifNotExists()
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`)
    )
    .addColumn("prompt", "text", (col) => col.notNull())
    .addColumn("response", "text")
    .addColumn("model", "varchar(100)", (col) => col.notNull())
    .addColumn("status", "varchar(50)", (col) =>
      col.notNull().defaultTo("pending")
    )
    .addColumn("langfuse_trace_id", "varchar(255)")
    .addColumn("error_message", "text")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // Seed sample user if empty
  await sql`
    INSERT INTO users (email, name)
    VALUES ('developer@euclid.dev', 'Euclid Developer')
    ON CONFLICT (email) DO NOTHING;
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("ai_tasks").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}
