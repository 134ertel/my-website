import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../database";
import { billingAccounts } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { getBillingAccount } from "../lib/billing";
import { PLANS, PLAN_IDS, type PlanId } from "../lib/plans";
import { paddle } from "../lib/paddle";

export const billingRoute = new Hono()
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const account = await getBillingAccount(user.id);
    const planId = account.planId as PlanId;
    const plan = PLANS[planId];

    return c.json(
      {
        planId,
        status: account.status,
        currentPeriodEnd: account.currentPeriodEnd,
        cancelAtPeriodEnd: account.cancelAtPeriodEnd,
        usage: {
          uploads: account.uploadsUsed,
          clips_generated: account.clipsGeneratedUsed,
          scheduled_posts: account.scheduledPostsUsed,
        },
        limits: {
          uploads: plan.limits.uploads,
          clips_generated: plan.limits.clips_generated,
          scheduled_posts: plan.limits.scheduled_posts,
          editor_access: plan.features.editor_access,
          social_posting: plan.features.social_posting,
          maxDurationSeconds: plan.maxDurationSeconds,
          upgradeMessage: planId === "free"
            ? "This video is longer than 10 minutes. Upgrade to Pro or Business to process longer videos."
            : planId === "pro"
              ? "This video is longer than 35 minutes. Upgrade to Business to process longer videos."
              : "",
        },
      },
      200,
    );
  })
  .get("/plans", async (c) => {
    return c.json(
      PLAN_IDS.map((id) => ({
        id,
        name: PLANS[id].name,
        priceDisplay: PLANS[id].priceDisplay,
        paddlePriceId: PLANS[id].paddlePriceId,
      })),
      200,
    );
  })
  .post("/cancel", requireAuth, async (c) => {
    const user = c.get("user")!;
    const account = await getBillingAccount(user.id);
    if (!account.paddleSubscriptionId) return c.json({ message: "Nothing to cancel" }, 400);

    await paddle.subscriptions.cancel(account.paddleSubscriptionId, { effectiveFrom: "next_billing_period" });
    await db.update(billingAccounts).set({ cancelAtPeriodEnd: true }).where(eq(billingAccounts.userId, user.id));
    return c.json({ ok: true }, 200);
  })
  .post("/uncancel", requireAuth, async (c) => {
    const user = c.get("user")!;
    const account = await getBillingAccount(user.id);
    if (!account.paddleSubscriptionId) return c.json({ message: "Nothing to undo" }, 400);

    await paddle.subscriptions.update(account.paddleSubscriptionId, { scheduledChange: null });
    await db.update(billingAccounts).set({ cancelAtPeriodEnd: false }).where(eq(billingAccounts.userId, user.id));
    return c.json({ ok: true }, 200);
  });
