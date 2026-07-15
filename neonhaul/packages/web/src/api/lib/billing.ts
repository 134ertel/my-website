import { eq } from "drizzle-orm";
import { db } from "../database";
import { billingAccounts } from "../database/schema";
import { PLANS, UPGRADE_MESSAGE, type MeteredFeature, type BooleanFeature, type PlanId } from "./plans";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const USAGE_COLUMN: Record<MeteredFeature, "uploadsUsed" | "clipsGeneratedUsed" | "scheduledPostsUsed"> = {
  uploads: "uploadsUsed",
  clips_generated: "clipsGeneratedUsed",
  scheduled_posts: "scheduledPostsUsed",
};

/**
 * Returns the user's local billing row, lazily creating a fresh free-tier row if none
 * exists, and rolling the usage period forward (resetting counters) if it has elapsed.
 * For paid plans this reset branch is a safety net — the Paddle webhook is the primary
 * reset trigger on renewal (see routes/webhooks.ts).
 */
export async function getBillingAccount(userId: string) {
  const [existing] = await db.select().from(billingAccounts).where(eq(billingAccounts.userId, userId));

  if (!existing) {
    const now = new Date();
    const [created] = await db
      .insert(billingAccounts)
      .values({ userId, currentPeriodStart: now, currentPeriodEnd: addMonths(now, 1) })
      .returning();
    return created;
  }

  if (Date.now() > existing.currentPeriodEnd.getTime()) {
    let start = existing.currentPeriodStart;
    let end = existing.currentPeriodEnd;
    while (end.getTime() < Date.now()) {
      start = end;
      end = addMonths(end, 1);
    }
    const [updated] = await db
      .update(billingAccounts)
      .set({ currentPeriodStart: start, currentPeriodEnd: end, uploadsUsed: 0, clipsGeneratedUsed: 0, scheduledPostsUsed: 0 })
      .where(eq(billingAccounts.userId, userId))
      .returning();
    return updated;
  }

  return existing;
}

export async function getPlanId(userId: string): Promise<PlanId> {
  const account = await getBillingAccount(userId);
  return account.planId as PlanId;
}

export async function getMaxDurationSeconds(userId: string): Promise<number> {
  const planId = await getPlanId(userId);
  return PLANS[planId].maxDurationSeconds;
}

export function upgradeMessageFor(planId: PlanId): string {
  return UPGRADE_MESSAGE[planId];
}

export async function hasFeature(userId: string, featureId: BooleanFeature): Promise<boolean> {
  const planId = await getPlanId(userId);
  return PLANS[planId].features[featureId];
}

export async function checkUsage(userId: string, featureId: MeteredFeature): Promise<{ allowed: boolean }> {
  const account = await getBillingAccount(userId);
  const planId = account.planId as PlanId;
  const limit = PLANS[planId].limits[featureId];
  const used = account[USAGE_COLUMN[featureId]];
  return { allowed: used < limit };
}

export async function trackUsage(userId: string, featureId: MeteredFeature, value = 1): Promise<void> {
  const column = USAGE_COLUMN[featureId];
  const account = await getBillingAccount(userId);
  await db
    .update(billingAccounts)
    .set({ [column]: account[column] + value })
    .where(eq(billingAccounts.userId, userId));
}
