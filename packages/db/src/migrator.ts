import "dotenv/config";
import { Migrator, type MigrationProvider, type Migration, type MigrationResult } from "kysely/migration";
import { db } from "./index.js";
import * as initialMigration from "./migrations/001_initial_schema.js";

const migrations: Record<string, Migration> = {
  "001_initial_schema": initialMigration,
};

const provider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

const migrator = new Migrator({
  db,
  provider,
});

async function run() {
  const command = process.argv[2] || "latest";

  console.log(`[db:migrator] Running migration command: ${command}`);

  let result;
  if (command === "down") {
    result = await migrator.migrateDown();
  } else if (command === "up" || command === "latest") {
    result = await migrator.migrateToLatest();
  } else {
    console.error(`Unknown command: ${command}. Use "latest", "up", or "down".`);
    process.exit(1);
  }

  const { error, results } = result;

  results?.forEach((it: MigrationResult) => {
    if (it.status === "Success") {
      console.log(`Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("Migration failed with error:");
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
  console.log("[db:migrator] Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
