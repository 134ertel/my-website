import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/auth";
import { upload } from "./routes/upload";
import { projectsRoute } from "./routes/projects";
import { clipsRoute } from "./routes/clips";
import { socialRoute } from "./routes/social";
import { scheduledPostsRoute } from "./routes/scheduled-posts";
import { featureRequestsRoute } from "./routes/feature-requests";
import { billingRoute } from "./routes/billing";
import { webhooksRoute } from "./routes/webhooks";
import "./lib/scheduler-worker";

const app = new Hono()
  .use(cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] }))
  .on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/api/webhooks", webhooksRoute)
  .basePath("api")
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  .route("/upload", upload)
  .route("/projects", projectsRoute)
  .route("/clips", clipsRoute)
  .route("/social", socialRoute)
  .route("/scheduled-posts", scheduledPostsRoute)
  .route("/feature-requests", featureRequestsRoute)
  .route("/billing", billingRoute);

export type AppType = typeof app;
export default app;
