import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js";
import { db } from "../database";
import { billingAccounts, webhookEvents } from "../database/schema";
import { planIdForPolarProductId } from "../lib/plans";

async function syncSubscription(sub: Subscription) {
  const planId = sub.productId ? planIdForPolarProductId(sub.productId) : null;
  const userId = sub.customer?.externalId ?? (sub.metadata?.userId as string | undefined);

  const [existing] = await db.select().from(billingAccounts).where(eq(billingAccounts.polarSubscriptionId, sub.id));
  const targetUserId = existing?.userId ?? userId;
  if (!targetUserId) {
    console.error("[polar webhook] no userId found for subscription", sub.id);
    return;
  }

  const currentPeriodStart = new Date(sub.currentPeriodStart);
  const currentPeriodEnd = new Date(sub.currentPeriodEnd);
  const isRenewal = Boolean(existing) && existing.currentPeriodStart.getTime() !== currentPeriodStart.getTime();

  const status =
    sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";

  const values = {
    userId: targetUserId,
    planId: status === "canceled" ? "free" : (planId ?? existing?.planId ?? "free"),
    status,
    polarCustomerId: sub.customerId,
    polarSubscriptionId: sub.id,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodStart,
    currentPeriodEnd,
    ...(isRenewal || !existing ? { uploadsUsed: 0, clipsGeneratedUsed: 0, scheduledPostsUsed: 0 } : {}),
  };

  if (existing) {
    await db.update(billingAccounts).set(values).where(eq(billingAccounts.userId, targetUserId));
  } else {
    await db.insert(billingAccounts).values(values);
  }
}

export const webhooksRoute = new Hono().post("/polar", async (c) => {
  const rawBody = await c.req.text();

  let event;
  try {
    event = validateEvent(rawBody, c.req.header(), process.env.POLAR_WEBHOOK_SECRET ?? "");
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      console.error("[polar webhook] signature verification failed:", e);
      return c.json({ message: "Invalid signature" }, 403);
    }
    throw e;
  }

  const webhookId = c.req.header("webhook-id");
  if (webhookId) {
    const [seen] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, webhookId));
    if (seen) return c.json({ ok: true }, 200);
    await db.insert(webhookEvents).values({ id: webhookId, eventType: event.type });
  }

  if (
    event.type === "subscription.created" ||
    event.type === "subscription.updated" ||
    event.type === "subscription.active" ||
    event.type === "subscription.canceled" ||
    event.type === "subscription.uncanceled" ||
    event.type === "subscription.past_due" ||
    event.type === "subscription.revoked"
  ) {
    await syncSubscription(event.data);
  }

  return c.json({ ok: true }, 200);
});
