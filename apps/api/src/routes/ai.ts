import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@euclid/db";
import { generateCompletion } from "@euclid/ai";
import { sendJob, QUEUES } from "@euclid/queue";

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt cannot be empty"),
  model: z.string().default("gpt-4o-mini"),
});

export const aiRoutes = new Hono()
  // Direct synchronous AI completion with Langfuse tracing
  .post("/sync", zValidator("json", generateSchema), async (c) => {
    const { prompt, model } = c.req.valid("json");

    // Insert task record
    const [inserted] = await db
      .insertInto("ai_tasks")
      .values({
        prompt,
        model,
        status: "processing",
      })
      .returning(["id", "created_at"])
      .execute();

    try {
      const result = await generateCompletion({
        prompt,
        model,
        taskId: inserted.id,
      });

      // Update task in DB
      await db
        .updateTable("ai_tasks")
        .set({
          response: result.text,
          status: "completed",
          langfuse_trace_id: result.traceId,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", inserted.id)
        .execute();

      return c.json({
        id: inserted.id,
        status: "completed",
        response: result.text,
        model: result.model,
        traceId: result.traceId,
        usage: result.usage,
      });
    } catch (error) {
      await db
        .updateTable("ai_tasks")
        .set({
          status: "failed",
          error_message: (error as Error).message,
          updated_at: new Date().toISOString(),
        })
        .where("id", "=", inserted.id)
        .execute();

      return c.json(
        {
          error: "Failed to generate AI response",
          message: (error as Error).message,
        },
        500
      );
    }
  })

  // Asynchronous job via pg-boss
  .post("/async", zValidator("json", generateSchema), async (c) => {
    const { prompt, model } = c.req.valid("json");

    // Create pending task record in DB
    const [task] = await db
      .insertInto("ai_tasks")
      .values({
        prompt,
        model,
        status: "pending",
      })
      .returning(["id", "status", "created_at"])
      .execute();

    // Push job to pg-boss queue
    const jobId = await sendJob(QUEUES.AI_GENERATE, {
      taskId: task.id,
      prompt,
      model,
    });

    return c.json({
      message: "AI generation queued in pg-boss",
      taskId: task.id,
      jobId,
      status: "pending",
    });
  })

  // Get task status & result
  .get("/task/:id", async (c) => {
    const id = c.req.param("id");

    const task = await db
      .selectFrom("ai_tasks")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    return c.json({ task });
  })

  // List recent tasks
  .get("/tasks", async (c) => {
    const tasks = await db
      .selectFrom("ai_tasks")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(20)
      .execute();

    return c.json({ tasks });
  });
