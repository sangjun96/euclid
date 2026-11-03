import { PgBoss, type SendOptions } from "pg-boss";
import type { JobPayloadMap, QueueName } from "./jobs.js";

export * from "./jobs.js";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/euclid_db";

export function createQueueBoss(customUrl?: string): PgBoss {
  const boss = new PgBoss({
    connectionString: customUrl || connectionString,
    schema: "pgboss",
    application_name: "euclid-pgboss",
    max: 10,
  });

  boss.on("error", (error: Error) => {
    console.error("[pg-boss] Error:", error);
  });

  return boss;
}

let sharedBoss: PgBoss | null = null;

export async function getQueueBoss(customUrl?: string): Promise<PgBoss> {
  if (!sharedBoss) {
    sharedBoss = createQueueBoss(customUrl);
    await sharedBoss.start();
  }
  return sharedBoss;
}

export async function sendJob<K extends QueueName>(
  queue: K,
  payload: JobPayloadMap[K],
  options?: SendOptions
): Promise<string | null> {
  const boss = await getQueueBoss();
  return boss.send(queue, payload, options);
}
