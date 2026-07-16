export const PLAN_IDS = ["free", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type MeteredFeature = "uploads" | "clips_generated" | "scheduled_posts";
export type BooleanFeature = "editor_access" | "social_posting";

type PlanDef = {
  name: string;
  priceDisplay: string | null; // null for free
  polarProductId: string | null; // Polar product ID, null for free
  maxDurationSeconds: number;
  limits: Record<MeteredFeature, number>;
  features: Record<BooleanFeature, boolean>;
};

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    name: "Starter",
    priceDisplay: null,
    polarProductId: null,
    maxDurationSeconds: 600, // 10 minutes
    limits: { uploads: 20, clips_generated: 60, scheduled_posts: 60 },
    features: { editor_access: false, social_posting: false },
  },
  pro: {
    name: "Pro",
    priceDisplay: "$10.99",
    polarProductId: process.env.POLAR_PRODUCT_ID_PRO ?? null,
    maxDurationSeconds: 2100, // 35 minutes
    limits: { uploads: Infinity, clips_generated: Infinity, scheduled_posts: Infinity },
    features: { editor_access: true, social_posting: true },
  },
  business: {
    name: "Business",
    priceDisplay: "$44.99",
    polarProductId: process.env.POLAR_PRODUCT_ID_BUSINESS ?? null,
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

/** Maps a Polar product ID (from a webhook payload) back to our local plan ID. */
export function planIdForPolarProductId(polarProductId: string): PlanId | null {
  for (const id of PLAN_IDS) {
    if (PLANS[id].polarProductId === polarProductId) return id;
  }
  return null;
}
