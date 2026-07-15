import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { EventName } from "@paddle/paddle-node-sdk";
import { paddle } from "../lib/paddle";
import { db } from "../database";
import { billingAccounts, webhookEvents } from "../database/schema";
import { planIdForPaddlePriceId } from "../lib/plans";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export const webhooksRoute = new Hono().post("/paddle", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("paddle-signature") ?? "";

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, process.env.PADDLE_WEBHOOK_SECRET ?? "", signature);
  } catch (e) {
    console.error("[paddle webhook] signature verification failed:", e);
    return c.json({ message: "Invalid signature" }, 401);
  }
  if (!event) return c.json({ message: "Invalid payload" }, 400);

  const [seen] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, event.eventId));
  if (seen) return c.json({ ok: true }, 200);
  await db.insert(webhookEvents).values({ id: event.eventId, eventType: event.eventType });

  if (event.eventType === EventName.SubscriptionCreated || event.eventType === EventName.SubscriptionUpdated) {
    const sub = event.data;
    const userId = (sub.customData as Record<string, unknown> | null)?.userId as string | undefined;
    const priceId = sub.items[0]?.price?.id;
    const planId = priceId ? planIdForPaddlePriceId(priceId) : null;

    const [existing] = await db.select().from(billingAccounts).where(eq(billingAccounts.paddleSubscriptionId, sub.id));
    const targetUserId = existing?.userId ?? userId;
    if (!targetUserId) {
      console.error("[paddle webhook] no userId found for subscription", sub.id);
      return c.json({ ok: true }, 200);
    }

    const currentPeriodStart = sub.currentBillingPeriod ? new Date(sub.currentBillingPeriod.startsAt) : new Date();
    const currentPeriodEnd = sub.currentBillingPeriod ? new Date(sub.currentBillingPeriod.endsAt) : addMonths(new Date(), 1);
    const isRenewal = existing && existing.currentPeriodStart.getTime() !== currentPeriodStart.getTime();
    const cancelAtPeriodEnd = sub.scheduledChange?.action === "cancel";

    const values = {
      userId: targetUserId,
      planId: planId ?? existing?.planId ?? "free",
      status: sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "active",
      paddleCustomerId: sub.customerId,
      paddleSubscriptionId: sub.id,
      cancelAtPeriodEnd,
      currentPeriodStart,
      currentPeriodEnd,
      ...(isRenewal || !existing ? { uploadsUsed: 0, clipsGeneratedUsed: 0, scheduledPostsUsed: 0 } : {}),
    };

    if (existing) {
      await db.update(billingAccounts).set(values).where(eq(billingAccounts.userId, targetUserId));
    } else {
      await db.insert(billingAccounts).values(values);
    }
  } else if (event.eventType === EventName.SubscriptionCanceled) {
    const sub = event.data;
    const now = new Date();
    await db
      .update(billingAccounts)
      .set({
        planId: "free",
        status: "canceled",
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: addMonths(now, 1),
        uploadsUsed: 0,
        clipsGeneratedUsed: 0,
        scheduledPostsUsed: 0,
      })
      .where(eq(billingAccounts.paddleSubscriptionId, sub.id));
  } else if (event.eventType === EventName.SubscriptionPaused) {
    const sub = event.data;
    await db.update(billingAccounts).set({ status: "past_due" }).where(eq(billingAccounts.paddleSubscriptionId, sub.id));
  }

  return c.json({ ok: true }, 200);
});
