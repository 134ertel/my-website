import { and, eq, lte } from "drizzle-orm";
import { db } from "../database";
import { scheduledPosts } from "../database/schema";
import { publishNow } from "../routes/scheduled-posts";

const POLL_INTERVAL_MS = 30_000;

async function pollDuePosts() {
  const due = await db
    .select()
    .from(scheduledPosts)
    .where(and(eq(scheduledPosts.status, "scheduled"), lte(scheduledPosts.scheduledAt, new Date())));

  for (const post of due) {
    publishNow(post.id).catch((e) => console.error("[scheduler-worker] publish failed:", post.id, e));
  }
}

declare global {
  var __schedulerWorkerStarted: boolean | undefined;
}

// Guard against duplicate intervals across Vite's dev-mode SSR module reloads.
if (!globalThis.__schedulerWorkerStarted) {
  globalThis.__schedulerWorkerStarted = true;
  setInterval(() => {
    pollDuePosts().catch((e) => console.error("[scheduler-worker] poll failed:", e));
  }, POLL_INTERVAL_MS);
}
