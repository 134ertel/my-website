import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { db } from "../database";
import { billingAccounts } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import { getBillingAccount } from "../lib/billing";
import { PLANS, PLAN_IDS, type PlanId } from "../lib/plans";
import { polar } from "../lib/polar";

const checkoutSchema = z.object({ planId: z.enum(["pro", "business"]) });

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
        polarProductId: PLANS[id].polarProductId,
      })),
      200,
    );
  })
  .post("/checkout", requireAuth, zValidator("json", checkoutSchema), async (c) => {
    const user = c.get("user")!;
    const { planId } = c.req.valid("json");
    const productId = PLANS[planId].polarProductId;
    if (!productId) return c.json({ message: "Plan is not purchasable" }, 400);

    const origin = c.req.header("origin") ?? process.env.WEBSITE_URL ?? "";

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${origin}/pricing?checkout=success`,
      embedOrigin: origin,
      externalCustomerId: user.id,
      customerEmail: user.email,
      metadata: { userId: user.id },
    });

    return c.json({ url: checkout.url }, 200);
  })
  .post("/cancel", requireAuth, async (c) => {
    const user = c.get("user")!;
    const account = await getBillingAccount(user.id);
    if (!account.polarSubscriptionId) return c.json({ message: "Nothing to cancel" }, 400);

    await polar.subscriptions.update({
      id: account.polarSubscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });
    await db.update(billingAccounts).set({ cancelAtPeriodEnd: true }).where(eq(billingAccounts.userId, user.id));
    return c.json({ ok: true }, 200);
  })
  .post("/uncancel", requireAuth, async (c) => {
    const user = c.get("user")!;
    const account = await getBillingAccount(user.id);
    if (!account.polarSubscriptionId) return c.json({ message: "Nothing to undo" }, 400);

    await polar.subscriptions.update({
      id: account.polarSubscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: false },
    });
    await db.update(billingAccounts).set({ cancelAtPeriodEnd: false }).where(eq(billingAccounts.userId, user.id));
    return c.json({ ok: true }, 200);
  });
