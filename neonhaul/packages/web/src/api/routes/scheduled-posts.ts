import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc } from "drizzle-orm";
import fs from "node:fs";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "../database";
import { scheduledPosts, clips, socialAccounts } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { s3 } from "../lib/s3";
import { tmpDir } from "../lib/ffmpeg";
import { uploadYoutubeShort } from "../lib/social/youtube";
import { postTiktokVideo } from "../lib/social/tiktok";
import { postInstagramReel } from "../lib/social/instagram";
import { checkUsage, trackUsage } from "../lib/billing";

const createSchema = z.object({
  clipId: z.string(),
  socialAccountId: z.string(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  scheduledAt: z.string(), // ISO date
});

async function downloadClipToTmp(renderedKey: string) {
  const dir = tmpDir("post");
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: renderedKey }), { expiresIn: 600 });
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const filePath = `${dir}/clip.mp4`;
  fs.writeFileSync(filePath, buf);
  return { dir, filePath, publicUrl: url };
}

export async function publishNow(postId: string) {
  const [post] = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, postId));
  if (!post) return;
  const [clip] = await db.select().from(clips).where(eq(clips.id, post.clipId));
  const [account] = await db.select().from(socialAccounts).where(eq(socialAccounts.id, post.socialAccountId));
  if (!clip || !clip.renderedKey || !account) {
    await db.update(scheduledPosts).set({ status: "failed", errorMessage: "Missing clip or account" }).where(eq(scheduledPosts.id, postId));
    return;
  }

  await db.update(scheduledPosts).set({ status: "posting" }).where(eq(scheduledPosts.id, postId));

  let dir: string | undefined;
  try {
    const caption = post.caption ?? clip.title;
    const tags = post.hashtags ? (JSON.parse(post.hashtags) as string[]) : [];

    let externalPostId = "";
    if (account.platform === "youtube") {
      const dl = await downloadClipToTmp(clip.renderedKey);
      dir = dl.dir;
      const result = await uploadYoutubeShort({
        refreshToken: account.refreshToken ?? "",
        filePath: dl.filePath,
        title: caption,
        description: clip.description ?? "",
        tags,
      });
      externalPostId = result.externalPostId;
    } else if (account.platform === "tiktok") {
      const dl = await downloadClipToTmp(clip.renderedKey);
      dir = dl.dir;
      const result = await postTiktokVideo({ accessToken: account.accessToken ?? "", filePath: dl.filePath, title: caption });
      externalPostId = result.externalPostId;
    } else if (account.platform === "instagram") {
      const dl = await downloadClipToTmp(clip.renderedKey);
      dir = dl.dir;
      const result = await postInstagramReel({
        accessToken: account.accessToken ?? "",
        igUserId: account.externalAccountId ?? "",
        videoUrl: dl.publicUrl,
        caption: `${caption}\n\n${tags.map((t) => `#${t}`).join(" ")}`,
      });
      externalPostId = result.externalPostId;
    }

    await db.update(scheduledPosts).set({ status: "posted", externalPostId, postedAt: new Date() }).where(eq(scheduledPosts.id, postId));
  } catch (e) {
    await db.update(scheduledPosts).set({ status: "failed", errorMessage: e instanceof Error ? e.message : String(e) }).where(eq(scheduledPosts.id, postId));
  } finally {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
}

export const scheduledPostsRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const rows = await db.select().from(scheduledPosts).where(eq(scheduledPosts.userId, user.id)).orderBy(desc(scheduledPosts.scheduledAt));
    return c.json({ posts: rows }, 200);
  })
  .post("/", requireAuth, zValidator("json", createSchema), async (c) => {
    const user = c.get("user")!;
    const body = c.req.valid("json");

    const { allowed } = await checkUsage(user.id, "scheduled_posts");
    if (!allowed) return c.json({ message: "Scheduled post limit reached for your plan. Upgrade to continue." }, 403);

    const [account] = await db.select().from(socialAccounts).where(and(eq(socialAccounts.id, body.socialAccountId), eq(socialAccounts.userId, user.id)));
    if (!account) return c.json({ message: "Social account not found" }, 404);

    const id = crypto.randomUUID();
    await db.insert(scheduledPosts).values({
      id,
      userId: user.id,
      clipId: body.clipId,
      socialAccountId: body.socialAccountId,
      platform: account.platform,
      caption: body.caption ?? null,
      hashtags: body.hashtags ? JSON.stringify(body.hashtags) : null,
      scheduledAt: new Date(body.scheduledAt),
      status: "scheduled",
    });

    await trackUsage(user.id, "scheduled_posts", 1);

    // If scheduled for now/past, publish immediately (fire and forget). Otherwise a real
    // deployment would need a cron/worker to poll due posts; this MVP posts on-demand via
    // the "Post Now" action or immediately when scheduledAt <= now.
    if (new Date(body.scheduledAt).getTime() <= Date.now() + 60_000) {
      publishNow(id).catch((e) => console.error("[publish] failed:", e));
    }

    return c.json({ id }, 201);
  })
  .post("/:id/post-now", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [post] = await db.select().from(scheduledPosts).where(and(eq(scheduledPosts.id, c.req.param("id")), eq(scheduledPosts.userId, user.id)));
    if (!post) return c.json({ message: "Not found" }, 404);
    publishNow(post.id).catch((e) => console.error("[publish] failed:", e));
    return c.json({ ok: true }, 200);
  })
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    await db.delete(scheduledPosts).where(and(eq(scheduledPosts.id, c.req.param("id")), eq(scheduledPosts.userId, user.id)));
    return c.json({ ok: true }, 200);
  });
