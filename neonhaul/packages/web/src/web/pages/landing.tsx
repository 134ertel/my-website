import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles, Scissors, Captions, Wand2, Send, Play, Youtube, Instagram,
} from "lucide-react";
import { Logo } from "../components/logo";

const FEATURES = [
  {
    icon: Wand2,
    title: "AI Clip Detection",
    body: "Automatically finds funny moments, emotional beats, educational highlights, gaming clips, podcasts, and interviews using AI engagement prediction.",
  },
  {
    icon: Scissors,
    title: "Smart Editing",
    body: "Auto-zooms on speakers, tracks faces, crops vertically, cuts silence, removes filler words, adds transitions, and improves audio.",
  },
  {
    icon: Captions,
    title: "Auto Captions",
    body: "Animated word-by-word captions with emojis, speaker colors, and keyword highlighting — styles inspired by Hormozi, Ali Abdaal, and MrBeast.",
  },
  {
    icon: Sparkles,
    title: "AI Hook Generator",
    body: "Rewrites the first 3 seconds to maximize retention. \"I wanted to explain...\" becomes \"Nobody talks about this...\"",
  },
  {
    icon: Send,
    title: "Auto Posting",
    body: "Connect TikTok, YouTube, Instagram and schedule instantly, tomorrow, daily, or at custom times.",
  },
];

const PLANS = [
  { name: "Starter", price: "$0", items: ["10 minute videos lengths", "20 uploads/month", "AI clips", "Auto captions"] },
  {
    name: "Pro",
    price: "$10.99",
    was: "$49",
    off: "78% OFF",
    items: ["35 minutes videos uploads", "100 uploads/month", "60 videos/month", "Access to Editor", "Auto Post"],
    highlighted: true,
  },
  {
    name: "Business",
    price: "$44.99",
    was: "$149",
    off: "70% OFF",
    items: ["Everything in Pro", "Unlimited uploads", "Unlimited clips", "Unlimited posting", "Priority rendering"],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-[#9AA0AC] md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-[#9AA0AC] hover:text-white">Sign in</Link>
            <Link href="/sign-in" className="rounded-xl bg-gradient-neon px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-neon opacity-[0.14] blur-[140px] animate-drift" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#9AA0AC]">
              <Sparkles className="h-3.5 w-3.5 text-[#00E5FF]" /> AI-powered video repurposing
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Turn One Video Into <span className="text-gradient-neon">100 Viral Clips.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-[#9AA0AC]">
              Upload a video or paste a YouTube link. Clipzy's AI automatically finds the best moments, edits them
              into engaging shorts, adds captions, and posts them to every platform you connect.
            </p>
            <div className="relative z-10 mt-8 flex items-center gap-4">
              <Link href="/sign-in" className="rounded-2xl bg-gradient-neon px-6 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(0,229,255,0.35)] transition hover:opacity-90">
                Start Free
              </Link>
              <button className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium hover:bg-white/10">
                <Play className="h-4 w-4" /> Watch Demo
              </button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-[#9AA0AC]">
              <span>Trusted by creators posting to</span>
              <Youtube className="h-4 w-4" /> <Instagram className="h-4 w-4" />
              <span className="font-display text-sm text-white/70">TikTok</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="glass-card glow-border relative p-4"
          >
            <div className="flex items-center gap-1.5 border-b border-white/8 px-2 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF4D4D]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFC72E]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#2EFFB0]/70" />
              <span className="ml-3 text-xs text-[#9AA0AC]">Clipzy — AI Editor</span>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3">
              {["Timeline", "AI Detection", "Captions"].map((label) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="mb-2 h-16 rounded-lg bg-gradient-to-br from-[#00E5FF]/20 via-[#8A2EFF]/20 to-[#FF2ED1]/20" />
                  <p className="text-xs text-[#9AA0AC]">{label}</p>
                </div>
              ))}
              {["TikTok Preview", "YT Shorts", "IG Reel"].map((label) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="mb-2 aspect-[9/16] rounded-lg bg-gradient-to-b from-[#111114] to-[#1a1a20]" />
                  <p className="text-xs text-[#9AA0AC]">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Everything you need to go viral, automatically.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="glass-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-neon">
                  <f.icon className="h-5 w-5 text-black" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-[#9AA0AC]">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Simple, transparent pricing.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={`glass-card p-7 ${p.highlighted ? "glow-border scale-[1.03]" : ""}`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-xl font-semibold">{p.name}</h3>
                  {p.off && <span className="rounded-full bg-gradient-neon px-2.5 py-1 text-xs font-bold text-black">{p.off}</span>}
                </div>
                {p.was && <p className="mt-3 text-sm text-[#9AA0AC] line-through">{p.was}/mo</p>}
                <p className={`font-display text-3xl font-bold ${p.was ? "mt-0.5" : "mt-3"}`}>{p.price}<span className="text-sm text-[#9AA0AC]">/mo</span></p>
                {p.was && <p className="mt-1 text-xs text-[#2EFFB0]">Limited-time deal — lock in this price now.</p>}
                <ul className="mt-5 space-y-2 text-sm text-[#9AA0AC]">
                  {p.items.map((i) => <li key={i}>• {i}</li>)}
                </ul>
                <Link
                  href="/sign-in"
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-semibold ${p.highlighted ? "bg-gradient-neon text-black" : "border border-white/10 bg-white/5 text-white"}`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-[#9AA0AC] md:flex-row">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} Clipzy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
