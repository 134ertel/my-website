export const PLAN_IDS = ["free", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type MeteredFeature = "uploads" | "clips_generated" | "scheduled_posts";
export type BooleanFeature = "editor_access" | "social_posting";

type PlanDef = {
  name: string;
  priceDisplay: string | null; // null for free
  paddlePriceId: string | null; // Paddle price ID, null for free
  maxDurationSeconds: number;
  limits: Record<MeteredFeature, number>;
  features: Record<BooleanFeature, boolean>;
};

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    name: "Starter",
    priceDisplay: null,
    paddlePriceId: null,
    maxDurationSeconds: 600, // 10 minutes
    limits: { uploads: 20, clips_generated: 60, scheduled_posts: 60 },
    features: { editor_access: false, social_posting: false },
  },
  pro: {
    name: "Pro",
    priceDisplay: "$10.99",
    paddlePriceId: process.env.PADDLE_PRICE_ID_PRO ?? null,
    maxDurationSeconds: 2100, // 35 minutes
    limits: { uploads: Infinity, clips_generated: Infinity, scheduled_posts: Infinity },
    features: { editor_access: true, social_posting: true },
  },
  business: {
    name: "Business",
    priceDisplay: "$44.99",
    paddlePriceId: process.env.PADDLE_PRICE_ID_BUSINESS ?? null,
    maxDurationSeconds: Infinity,
    limits: { uploads: Infinity, clips_generated: Infinity, scheduled_posts: Infinity },
    features: { editor_access: true, social_posting: true },
  },
};

export const UPGRADE_MESSAGE: Record<PlanId, string> = {
  free: "This video is longer than 10 minutes. Upgrade to Pro or Business to process longer videos.",
  pro: "This video is longer than 35 minutes. Upgrade to Business to process longer videos.",
  business: "",
};

/** Maps a Paddle price ID (from a webhook payload) back to our local plan ID. */
export function planIdForPaddlePriceId(paddlePriceId: string): PlanId | null {
  for (const id of PLAN_IDS) {
    if (PLANS[id].paddlePriceId === paddlePriceId) return id;
  }
  return null;
}
