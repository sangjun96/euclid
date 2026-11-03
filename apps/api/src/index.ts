import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { db, sql } from "@euclid/db";
import { getQueueBoss } from "@euclid/queue";
import { aiRoutes } from "./routes/ai.js";
import { userRoutes } from "./routes/users.js";

const app = new Hono();

app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Mount routes with chained return for RPC type inference
const routes = app
  .get("/health", async (c) => {
    let dbStatus = "disconnected";
    let bossStatus = "disconnected";

    try {
      await sql`SELECT 1`.execute(db);
      dbStatus = "connected";
    } catch (err) {
      dbStatus = `error: ${(err as Error).message}`;
    }

    try {
      const boss = await getQueueBoss();
      bossStatus = boss ? "ready" : "not-initialized";
    } catch (err) {
      bossStatus = `error: ${(err as Error).message}`;
    }

    return c.json({
      status: dbStatus === "connected" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        pgBoss: bossStatus,
      },
    });
  })
  .route("/api/ai", aiRoutes)
  .route("/api/users", userRoutes);

export type AppType = typeof routes;

const port = Number(process.env.PORT) || 4000;

console.log(`[API] Server is starting on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`[API] Hono server running at http://localhost:${info.port}`);
  }
);

export default app;
