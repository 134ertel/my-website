import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, desc } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "../database";
import { clips, projects } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { s3 } from "../lib/s3";
import { reprocessClip } from "../lib/pipeline";
import type { CaptionWord } from "../lib/ffmpeg";
import { hasFeature } from "../lib/billing";

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

const CAPTION_STYLE_IDS = ["modern", "gaming", "podcast", "minimal", "mrbeast", "hormozi"] as const;
const FILTER_IDS = ["none", "bw", "vintage", "vibrant", "cinematic"] as const;
const RESOLUTION_IDS = ["720p", "1080p", "1440p"] as const;
const CAPTION_POSITION_IDS = ["top", "middle", "bottom"] as const;

const reprocessSchema = z.object({
  captionStyle: z.enum(CAPTION_STYLE_IDS).optional(),
  captionSize: z.number().min(10).max(60).optional(),
  captionText: z.string().optional(),
  captionPosition: z.enum(CAPTION_POSITION_IDS).optional(),
  filter: z.enum(FILTER_IDS).optional(),
  emojis: z.array(z.object({ emoji: z.string(), position: z.string() })).max(6).optional(),
  resolution: z.enum(RESOLUTION_IDS).optional(),
});

function downloadFilename(title: string) {
  return `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "clip"}.mp4`;
}

/** Spreads edited caption text evenly across the clip's original time range. */
function textToWords(text: string, start: number, end: number): CaptionWord[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const step = (end - start) / tokens.length;
  return tokens.map((word, i) => ({ word, start: start + i * step, end: start + (i + 1) * step }));
}

export const clipsRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const rows = await db.select().from(clips).where(eq(clips.userId, user.id)).orderBy(desc(clips.createdAt));
    const withUrls = await Promise.all(
      rows.map(async (clip) => ({
        ...clip,
        videoUrl: clip.renderedKey
          ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.renderedKey }), { expiresIn: 3600 })
          : null,
        downloadUrl: clip.renderedKey ? `/api/clips/${clip.id}/download` : null,
        thumbnailUrl: clip.thumbnailKey
          ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.thumbnailKey }), { expiresIn: 3600 })
          : null,
      })),
    );
    return c.json({ clips: withUrls }, 200);
  })
  .get("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [clip] = await db.select().from(clips).where(eq(clips.id, c.req.param("id")));
    if (!clip || clip.userId !== user.id) return c.json({ message: "Not found" }, 404);

    const videoUrl = clip.renderedKey
      ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.renderedKey }), { expiresIn: 3600 })
      : null;
    const downloadUrl = clip.renderedKey ? `/api/clips/${clip.id}/download` : null;

    let captionText = "";
    if (clip.captionWords) {
      captionText = (JSON.parse(clip.captionWords) as CaptionWord[]).map((w) => w.word).join(" ");
    } else {
      const [project] = await db.select().from(projects).where(eq(projects.id, clip.projectId));
      const transcript = project?.transcript ? JSON.parse(project.transcript) : { words: [] };
      captionText = ((transcript.words ?? []) as CaptionWord[])
        .filter((w) => w.start >= clip.startSeconds && w.start <= clip.endSeconds)
        .map((w) => w.word)
        .join(" ");
    }

    return c.json({ clip: { ...clip, videoUrl, downloadUrl, captionText } }, 200);
  })
  .get("/:id/download", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [clip] = await db.select().from(clips).where(eq(clips.id, c.req.param("id")));
    if (!clip || clip.userId !== user.id || !clip.renderedKey) return c.json({ message: "Not found" }, 404);

    const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.renderedKey }));
    const bytes = await obj.Body!.transformToByteArray();

    return new Response(bytes, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${downloadFilename(clip.title)}"`,
        "Content-Length": String(bytes.length),
      },
    });
  })
  .post("/:id/reprocess", requireAuth, zValidator("json", reprocessSchema), async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const [clip] = await db.select().from(clips).where(eq(clips.id, id));
    if (!clip || clip.userId !== user.id) return c.json({ message: "Not found" }, 404);

    const allowed = await hasFeature(user.id, "editor_access");
    if (!allowed) return c.json({ message: "The video editor requires a Pro or Business plan. Upgrade to continue." }, 403);

    const body = c.req.valid("json");
    const patch: Partial<typeof clips.$inferInsert> = { status: "rendering", errorMessage: null };
    if (body.captionStyle) patch.captionStyle = body.captionStyle;
    if (body.captionSize !== undefined) patch.captionSize = body.captionSize;
    if (body.captionText !== undefined) {
      patch.captionWords = JSON.stringify(textToWords(body.captionText, clip.startSeconds, clip.endSeconds));
    }
    if (body.captionPosition) patch.captionPosition = body.captionPosition;
    if (body.filter) patch.filter = body.filter;
    if (body.emojis !== undefined) patch.emojis = JSON.stringify(body.emojis);
    if (body.resolution) patch.resolution = body.resolution;

    await db.update(clips).set(patch).where(eq(clips.id, id));
    reprocessClip(id).catch((e) => console.error("[reprocess] failed:", e));

    return c.json({ ok: true }, 202);
  })
  .patch("/:id", requireAuth, zValidator("json", updateSchema), async (c) => {
    const user = c.get("user")!;
    const id = c.req.param("id");
    const [clip] = await db.select().from(clips).where(eq(clips.id, id));
    if (!clip || clip.userId !== user.id) return c.json({ message: "Not found" }, 404);

    const body = c.req.valid("json");
    await db
      .update(clips)
      .set({
        ...(body.title ? { title: body.title } : {}),
        ...(body.description ? { description: body.description } : {}),
        ...(body.hashtags ? { hashtags: JSON.stringify(body.hashtags) } : {}),
      })
      .where(eq(clips.id, id));

    return c.json({ ok: true }, 200);
  });
