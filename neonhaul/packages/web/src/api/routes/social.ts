import { siteUrl } from "../lib/site-url";
import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../database";
import { socialAccounts } from "../database/schema";
import { requireAuth } from "../middleware/auth";
import {
  isYoutubeConfigured, getYoutubeAuthUrl, exchangeYoutubeCode,
} from "../lib/social/youtube";
import {
  isTiktokConfigured, getTiktokAuthUrl, exchangeTiktokCode,
} from "../lib/social/tiktok";
import {
  isInstagramConfigured, getInstagramAuthUrl, exchangeInstagramCode,
} from "../lib/social/instagram";
import { hasFeature } from "../lib/billing";

const PLATFORMS = ["youtube", "tiktok", "instagram"] as const;
type Platform = (typeof PLATFORMS)[number];

function isConfigured(platform: Platform) {
  if (platform === "youtube") return isYoutubeConfigured();
  if (platform === "tiktok") return isTiktokConfigured();
  if (platform === "instagram") return isInstagramConfigured();
  return false;
}

// In-memory OAuth state -> userId map (short-lived, single-instance server).
const pendingStates = new Map<string, { userId: string; platform: Platform; expiresAt: number }>();

function cleanupStates() {
  const now = Date.now();
  for (const [k, v] of pendingStates) if (v.expiresAt < now) pendingStates.delete(k);
}

export const socialRoute = new Hono()
  .get("/accounts", requireAuth, async (c) => {
    const user = c.get("user")!;
    const rows = await db.select().from(socialAccounts).where(eq(socialAccounts.userId, user.id));
    return c.json({
      accounts: rows,
      configured: Object.fromEntries(PLATFORMS.map((p) => [p, isConfigured(p)])),
    }, 200);
  })
  .delete("/accounts/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    await db.delete(socialAccounts).where(and(eq(socialAccounts.id, c.req.param("id")), eq(socialAccounts.userId, user.id)));
    return c.json({ ok: true }, 200);
  })
  .get("/:platform/connect", requireAuth, async (c) => {
    const user = c.get("user")!;
    const platform = c.req.param("platform") as Platform;
    if (!PLATFORMS.includes(platform)) return c.json({ message: "Unknown platform" }, 400);
    if (!isConfigured(platform)) {
      return c.json({ message: `${platform} isn't configured yet — add developer API credentials first.` }, 400);
    }

    const allowed = await hasFeature(user.id, "social_posting");
    if (!allowed) {
      return c.json({ message: "Connecting social accounts to auto-post requires a Pro or Business plan. Upgrade to continue." }, 403);
    }

    cleanupStates();
    const state = crypto.randomUUID();
    pendingStates.set(state, { userId: user.id, platform, expiresAt: Date.now() + 10 * 60 * 1000 });

    const url =
      platform === "youtube" ? getYoutubeAuthUrl(state) :
      platform === "tiktok" ? getTiktokAuthUrl(state) :
      getInstagramAuthUrl(state);

    return c.json({ url }, 200);
  })
  .get("/youtube/callback", async (c) => {
    const { code, state } = c.req.query();
    const pending = state ? pendingStates.get(state) : undefined;
    if (!pending || pending.platform !== "youtube") return c.redirect(`${siteUrl()}/connections?error=invalid_state`);
    pendingStates.delete(state);

    try {
      const result = await exchangeYoutubeCode(code);
      await db.insert(socialAccounts).values({
        id: crypto.randomUUID(),
        userId: pending.userId,
        platform: "youtube",
        accountName: result.accountName,
        avatarUrl: result.avatarUrl,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenExpiresAt: result.expiresAt,
        externalAccountId: result.externalAccountId,
        status: "connected",
      });
      return c.redirect(`${siteUrl()}/connections?connected=youtube`);
    } catch (e) {
      return c.redirect(`${siteUrl()}/connections?error=${encodeURIComponent(e instanceof Error ? e.message : "unknown")}`);
    }
  })
  .get("/tiktok/callback", async (c) => {
    const { code, state } = c.req.query();
    const pending = state ? pendingStates.get(state) : undefined;
    if (!pending || pending.platform !== "tiktok") return c.redirect(`${siteUrl()}/connections?error=invalid_state`);
    pendingStates.delete(state);

    try {
      const result = await exchangeTiktokCode(code);
      await db.insert(socialAccounts).values({
        id: crypto.randomUUID(),
        userId: pending.userId,
        platform: "tiktok",
        accountName: result.accountName,
        avatarUrl: result.avatarUrl,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenExpiresAt: result.expiresAt,
        externalAccountId: result.externalAccountId,
        status: "connected",
      });
      return c.redirect(`${siteUrl()}/connections?connected=tiktok`);
    } catch (e) {
      return c.redirect(`${siteUrl()}/connections?error=${encodeURIComponent(e instanceof Error ? e.message : "unknown")}`);
    }
  })
  .get("/instagram/callback", async (c) => {
    const { code, state } = c.req.query();
    const pending = state ? pendingStates.get(state) : undefined;
    if (!pending || pending.platform !== "instagram") return c.redirect(`${siteUrl()}/connections?error=invalid_state`);
    pendingStates.delete(state);

    try {
      const result = await exchangeInstagramCode(code);
      await db.insert(socialAccounts).values({
        id: crypto.randomUUID(),
        userId: pending.userId,
        platform: "instagram",
        accountName: result.accountName,
        avatarUrl: result.avatarUrl,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenExpiresAt: result.expiresAt,
        externalAccountId: result.externalAccountId,
        status: "connected",
      });
      return c.redirect(`${siteUrl()}/connections?connected=instagram`);
    } catch (e) {
      return c.redirect(`${siteUrl()}/connections?error=${encodeURIComponent(e instanceof Error ? e.message : "unknown")}`);
    }
  });
