import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { db } from "../database";
import { featureRequests, user } from "../database/schema";
import { requireAuth } from "../middleware/auth";

const createSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const featureRequestsRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const rows = await db
      .select({ id: featureRequests.id, text: featureRequests.text, createdAt: featureRequests.createdAt, authorName: user.name })
      .from(featureRequests)
      .leftJoin(user, eq(user.id, featureRequests.userId))
      .orderBy(desc(featureRequests.createdAt));
    return c.json({ requests: rows }, 200);
  })
  .post("/", requireAuth, zValidator("json", createSchema), async (c) => {
    const authUser = c.get("user")!;
    const { text } = c.req.valid("json");
    await db.insert(featureRequests).values({ id: crypto.randomUUID(), userId: authUser.id, text });
    return c.json({ ok: true }, 201);
  });
