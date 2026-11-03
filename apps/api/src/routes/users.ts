import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@euclid/db";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

export const userRoutes = new Hono()
  .get("/", async (c) => {
    const users = await db
      .selectFrom("users")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();

    return c.json({ users });
  })

  .post("/", zValidator("json", createUserSchema), async (c) => {
    const body = c.req.valid("json");

    try {
      const [newUser] = await db
        .insertInto("users")
        .values({
          email: body.email,
          name: body.name,
        })
        .returningAll()
        .execute();

      return c.json({ user: newUser }, 201);
    } catch (error) {
      return c.json(
        {
          error: "Failed to create user",
          message: (error as Error).message,
        },
        400
      );
    }
  });
