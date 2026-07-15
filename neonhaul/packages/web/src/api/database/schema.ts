import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

// ---- Projects (uploaded source videos) ----
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  sourceType: text("source_type").notNull(), // "upload" | "youtube"
  sourceKey: text("source_key"), // tigris key for uploaded file
  sourceUrl: text("source_url"), // youtube url if applicable
  durationSeconds: real("duration_seconds"),
  status: text("status").notNull().default("uploaded"), // uploaded, transcribing, analyzing, editing, rendering, completed, failed
  progress: integer("progress").notNull().default(0), // 0-100
  errorMessage: text("error_message"),
  transcript: text("transcript"), // JSON string of segments [{start,end,text}]
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(now).$onUpdate(() => new Date()).notNull(),
});

// ---- Clips (AI-generated short clips from a project) ----
export const clips = sqliteTable("clips", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  hook: text("hook"),
  description: text("description"),
  hashtags: text("hashtags"), // JSON array string
  startSeconds: real("start_seconds").notNull(),
  endSeconds: real("end_seconds").notNull(),
  viralScore: integer("viral_score").default(0), // 0-100
  category: text("category"), // funny, emotional, educational, gaming, podcast, interview
  captionStyle: text("caption_style").default("modern"),
  captionSize: integer("caption_size"), // overrides the style's default font size when set
  captionWords: text("caption_words"), // JSON [{word,start,end}] override; null = use project transcript as-is
  captionPosition: text("caption_position").default("bottom"), // top, middle, bottom
  filter: text("filter").default("none"), // none, vintage, bw, vibrant, cinematic
  emojis: text("emojis"), // JSON [{emoji, position}] static overlay for the clip's duration
  resolution: text("resolution").default("1080p"), // 720p, 1080p, 1440p (vertical output height/width pair)
  status: text("status").notNull().default("queued"), // queued, rendering, completed, failed
  renderedKey: text("rendered_key"), // tigris key of final vertical video
  thumbnailKey: text("thumbnail_key"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(now).$onUpdate(() => new Date()).notNull(),
});

// ---- Social Accounts (connected platform accounts) ----
export const socialAccounts = sqliteTable("social_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(), // youtube, tiktok, instagram
  accountName: text("account_name"),
  avatarUrl: text("avatar_url"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp_ms" }),
  externalAccountId: text("external_account_id"),
  status: text("status").notNull().default("connected"), // connected, expired, error
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
});

// ---- Scheduled Posts ----
export const scheduledPosts = sqliteTable("scheduled_posts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  clipId: text("clip_id").notNull(),
  socialAccountId: text("social_account_id").notNull(),
  platform: text("platform").notNull(),
  caption: text("caption"),
  hashtags: text("hashtags"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, posting, posted, failed
  externalPostId: text("external_post_id"),
  errorMessage: text("error_message"),
  postedAt: integer("posted_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
});

// ---- Feature Requests (clients suggesting what to add next) ----
export const featureRequests = sqliteTable("feature_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
});

// ---- Billing (local mirror of the customer's Paddle subscription + usage) ----
export const billingAccounts = sqliteTable("billing_accounts", {
  userId: text("user_id").primaryKey(),
  planId: text("plan_id").notNull().default("free"), // free, pro, business
  status: text("status").notNull().default("active"), // active, canceled, past_due
  paddleCustomerId: text("paddle_customer_id"),
  paddleSubscriptionId: text("paddle_subscription_id"),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  currentPeriodStart: integer("current_period_start", { mode: "timestamp_ms" }).default(now).notNull(),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }).notNull(),
  uploadsUsed: integer("uploads_used").notNull().default(0),
  clipsGeneratedUsed: integer("clips_generated_used").notNull().default(0),
  scheduledPostsUsed: integer("scheduled_posts_used").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(now).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(now).$onUpdate(() => new Date()).notNull(),
});

// ---- Webhook Events (idempotency guard for Paddle webhook redelivery) ----
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(), // Paddle's event ID
  eventType: text("event_type").notNull(),
  receivedAt: integer("received_at", { mode: "timestamp_ms" }).default(now).notNull(),
});

// ---- Clip Analytics (synced or manual stats per posted clip) ----
export const clipAnalytics = sqliteTable("clip_analytics", {
  id: text("id").primaryKey(),
  scheduledPostId: text("scheduled_post_id").notNull(),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  shares: integer("shares").default(0),
  comments: integer("comments").default(0),
  watchTimeSeconds: real("watch_time_seconds").default(0),
  retentionRate: real("retention_rate").default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(now).$onUpdate(() => new Date()).notNull(),
});
