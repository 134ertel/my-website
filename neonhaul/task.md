# NeonHaul build progress

## Scope decided
- Web + Desktop (default template covers desktop loading web app, no extra work needed unless custom native features requested)
- Social integrations to wire: YouTube (Shorts), TikTok, Instagram (OAuth+posting code; needs user's dev credentials via ask_secrets before they'll actually work)
- Transcription: OpenAI Whisper API (need OPENAI_API_KEY via ask_secrets)
- Payments: real Stripe via Autumn — DONE (autumn.config.ts pushed: free/pro/business plans)
- Auth: managed Google + email/password — DONE (auth.ts written, schema generated)

## Done
- app_init at /home/user/neonhaul
- design.md written (dark neon glassmorphism, Sora+Inter)
- deps installed (better-auth, managed-auth, s3, ai sdk, googleapis, openai, recharts, framer-motion, autumn-js, atmn)
- auth.ts (managed google/apple/microsoft + email/password + autumn plugin)
- domain schema.ts (projects, clips, socialAccounts, scheduledPosts, clipAnalytics)
- db:push done
- autumn config pushed

## In progress / next
- lib/s3.ts done
- Need: agent/gateway.ts, lib/ffmpeg helpers, lib/transcribe.ts (OpenAI Whisper), lib/social/{youtube,tiktok,instagram}.ts
- API routes: upload presign, projects (create/list/get), process pipeline (kick off transcription->AI moment detection->render clips via ffmpeg), clips (list/get/update/render), social/connect + callback, scheduled-posts CRUD + manual "post now", analytics
- Auth middleware
- Mount everything in index.ts (auth BEFORE basePath, autumn handled via plugin already)
- Frontend: landing, sign-in, dashboard shell w/ sidebar, upload page, processing screen, clips list + clip editor (basic), scheduler calendar, connections page, analytics page, pricing page, settings
- ask_secrets for OPENAI_API_KEY + social platform dev credentials (after building the OAuth code paths, so we know exact var names)
- bun run build to verify compile
- deliver

## Frontend progress (this session)
- index.html: fonts + title done
- styles.css: dark neon theme vars + glass/gradient utilities done
- lib/auth.ts, lib/api.ts (bearer), main.tsx (AutumnProvider + handleRedirect) done
- components: protected-route, layout/app-shell (sidebar), status-badge done
- pages done: landing.tsx, sign-in.tsx, dashboard.tsx
- pages TODO: upload.tsx, projects list page, project-detail.tsx (processing steps + clip grid),
  clip editor, scheduler.tsx, connections.tsx, analytics.tsx, pricing.tsx, settings.tsx
- app.tsx needs full route wiring
- After all pages: bun run build to typecheck, then start dev server, verify via browser, then ask_secrets for OPENAI_API_KEY (required for pipeline to work at all) and mention optional social creds.

## Key technical notes
- ffmpeg/ffprobe confirmed available in sandbox at /usr/bin
- Rendering pipeline (server-side, in Hono route, using Bun.spawn to call ffmpeg):
  1. Download source video from tigris (or via ffmpeg reading YouTube via yt-dlp if source is youtube URL) to /tmp
  2. Extract audio -> send to OpenAI Whisper for transcript w/ timestamps
  3. Send transcript to LLM (claude-sonnet via gateway) -> ask for N viral moments {start,end,title,hook,description,hashtags,category,viralScore}
  4. For each clip: ffmpeg cut segment, crop/scale to 1080x1920 (center-crop simple, not real face tracking), generate ASS/SRT captions from whisper word timings, burn in via ffmpeg subtitles filter, output to /tmp, upload rendered mp4 to tigris, generate thumbnail via ffmpeg -ss
  5. Update clip row status completed with renderedKey
- Real social auto-posting: YouTube via googleapis (needs Google Cloud OAuth client id/secret + refresh token per connected channel - use standard googleapis OAuth2 flow). TikTok Content Posting API needs client_key/client_secret + user access token via TikTok's own OAuth (v2 API, requires app in TikTok dev portal, unaudited apps limited to private/self-view posting). Instagram posting via Instagram Graph API (needs Facebook app + Instagram Business account linked, long-lived token).
- Since long processing (video download, whisper, ffmpeg render) can take a while, run pipeline as fire-and-forget async function after returning 202 from the process endpoint, poll `status`/`progress` from frontend.
