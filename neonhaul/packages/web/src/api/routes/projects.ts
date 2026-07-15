import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "../database";
import { projects, clips } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { s3 } from "../lib/s3";
import { runPipeline } from "../lib/pipeline";
import { getYoutubeDurationSeconds } from "../lib/ffmpeg";
import { requestCancel } from "../lib/cancellation";
import { checkUsage, trackUsage, getMaxDurationSeconds, getPlanId, upgradeMessageFor } from "../lib/billing";

const createSchema = z.object({
  title: z.string().min(1),
  sourceType: z.enum(["upload", "youtube"]),
  sourceKey: z.string().optional(),
  sourceUrl: z.string().optional(),
  durationSeconds: z.number().optional(),
});

export const projectsRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const rows = await db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(desc(projects.createdAt));
    return c.json({ projects: rows }, 200);
  })
  .post("/", requireAuth, zValidator("json", createSchema), async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const { allowed } = await checkUsage(user.id, "uploads");
    if (!allowed) return c.json({ message: "Upload limit reached for your plan. Upgrade to continue." }, 403);

    let durationSeconds = body.durationSeconds;
    if (body.sourceType === "youtube" && body.sourceUrl) {
      durationSeconds = await getYoutubeDurationSeconds(body.sourceUrl).catch(() => undefined);
    }
    if (durationSeconds !== undefined) {
      const maxDuration = await getMaxDurationSeconds(user.id);
      if (durationSeconds > maxDuration) {
        const planId = await getPlanId(user.id);
        return c.json({ message: upgradeMessageFor(planId) }, 403);
      }
    }

    const id = crypto.randomUUID();
    await db.insert(projects).values({
      id,
      userId: user.id,
      title: body.title,
      sourceType: body.sourceType,
      sourceKey: body.sourceKey ?? null,
      sourceUrl: body.sourceUrl ?? null,
      status: "uploaded",
      progress: 0,
    });

    await trackUsage(user.id, "uploads", 1);

    runPipeline(id).catch((e) => console.error("[pipeline] failed:", e));

    return c.json({ id }, 201);
  })
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== user.id) return c.json({ message: "Not found" }, 404);
    return c.json({ project }, 200);
  })
  .get("/:id/clips", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== user.id) return c.json({ message: "Not found" }, 404);

    const rows = await db.select().from(clips).where(eq(clips.projectId, id)).orderBy(desc(clips.viralScore));
    const withUrls = await Promise.all(
      rows.map(async (clip) => ({
        ...clip,
        videoUrl: clip.renderedKey
          ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.renderedKey }), { expiresIn: 3600 })
          : null,
        thumbnailUrl: clip.thumbnailKey
          ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.thumbnailKey }), { expiresIn: 3600 })
          : null,
      })),
    );

    return c.json({ clips: withUrls }, 200);
  })
  .post("/:id/cancel", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== user.id) return c.json({ message: "Not found" }, 404);
    if (["completed", "failed", "cancelled"].includes(project.status)) {
      return c.json({ message: "Nothing to cancel" }, 400);
    }

    requestCancel(id);
    await db.update(projects).set({ status: "cancelled" }).where(eq(projects.id, id));
    return c.json({ ok: true }, 200);
  })
  .post("/:id/retry", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project || project.userId !== user.id) return c.json({ message: "Not found" }, 404);

    await db.update(projects).set({ status: "uploaded", progress: 0, errorMessage: null }).where(eq(projects.id, id));
    runPipeline(id).catch((e) => console.error("[pipeline] failed:", e));
    return c.json({ ok: true }, 200);
  });
