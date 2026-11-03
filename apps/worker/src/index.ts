import "dotenv/config";
import { getQueueBoss, QUEUES, type AiGenerateJobPayload } from "@euclid/queue";
import { db } from "@euclid/db";
import { generateCompletion } from "@euclid/ai";

async function startWorker() {
  console.log("[Worker] Initializing pg-boss worker...");
  const boss = await getQueueBoss();

  // Ensure queue exists in pg-boss schema before polling
  await boss.createQueue(QUEUES.AI_GENERATE);

  console.log(`[Worker] Listening on queue: "${QUEUES.AI_GENERATE}"...`);

  await boss.work<AiGenerateJobPayload>(
    QUEUES.AI_GENERATE,
    { batchSize: 2 },
    async ([job]) => {
      const { taskId, prompt, model } = job.data;
      console.log(`[Worker] Processing AI task: ${taskId} (model: ${model})`);

      // Update status to processing
      await db
        .updateTable("ai_tasks")
        .set({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", taskId)
        .execute();

      try {
        const result = await generateCompletion({
          prompt,
          model,
          taskId,
        });

        // Update task with result
        await db
          .updateTable("ai_tasks")
          .set({
            status: "completed",
            response: result.text,
            langfuse_trace_id: result.traceId,
            updated_at: new Date().toISOString(),
          })
          .where("id", "=", taskId)
          .execute();

        console.log(
          `[Worker] Completed AI task: ${taskId} (traceId: ${result.traceId})`
        );
      } catch (error) {
        console.error(`[Worker] Failed AI task: ${taskId}`, error);

        await db
          .updateTable("ai_tasks")
          .set({
            status: "failed",
            error_message: (error as Error).message,
            updated_at: new Date().toISOString(),
          })
          .where("id", "=", taskId)
          .execute();

        throw error; // Let pg-boss handle retry according to policy
      }
    }
  );

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] Received ${signal}. Stopping worker gracefully...`);
    try {
      await boss.stop({ graceful: true, timeout: 5000 });
      await db.destroy();
      console.log("[Worker] Worker stopped cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("[Worker] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.log("[Worker] Ready and awaiting jobs.");
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
