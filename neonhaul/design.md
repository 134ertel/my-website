# Clipzy — Design System

## Vibe
Modern dark UI. Discord × Linear × Vercel × Stripe × Arc Browser, combined. Premium, futuristic, minimal but glowing.

## Colors (CSS variables in `packages/web/src/web/index.css`)
```
--bg: #0B0B0D
--bg-elevated: #111114
--surface: rgba(255,255,255,0.04)  /* glass card fill */
--border-glow: rgba(0,229,255,0.25)
--neon-blue: #00E5FF
--neon-purple: #8A2EFF
--neon-pink: #FF2ED1
--text-primary: #F5F6F8
--text-muted: #9AA0AC
--success: #2EFFB0
--warning: #FFC72E
--danger: #FF4D4D
```
Gradients: `linear-gradient(135deg, #00E5FF, #8A2EFF, #FF2ED1)` for CTAs, headline accents, progress bars, active nav states.

## Typography
- Display/headlines: **Sora** (bold, tight tracking)
- Body/UI: **Inter**
- Load both via Google Fonts in `index.html`.

## Components
- **Glass cards**: `background: var(--surface); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;` Add glowing border on hover (`box-shadow: 0 0 24px var(--border-glow)`).
- **Buttons**: primary = gradient fill, soft glow on hover, `border-radius: 14px`. Secondary = glass with neon-blue border.
- **Sidebar**: fixed dark, icons brighten (neon-blue) when active, thin gradient indicator bar.
- **Progress/processing steps**: vertical checklist, each step glows neon-blue when active, neon-green check when done.
- **Charts**: neon line/bar charts on dark background (recharts with custom neon colors).
- **Badges**: pill-shaped, color-coded by status (Processing = blue, Editing = purple, Posting = pink, Completed = green).

## Layout
- Landing: full-bleed hero with animated gradient mesh + floating particles (CSS/canvas), dashboard mockup on right.
- App shell: fixed left sidebar (240px) + top bar + content area, generous padding, 12-col grid for cards.
- Rounded corners 16–24px everywhere. Generous negative space, no cramped grids.

## Motion
- Framer Motion (motion/react) for staggered fade+slide on page load, card hover lift (`y: -4`), button glow pulse on hover, animated gradient backgrounds via CSS keyframes, sidebar icon color transitions.

## Anti-patterns to avoid
No purple-on-white, no generic Inter-only look (pair with Sora for display), no flat cookie-cutter cards without glass/glow treatment.
