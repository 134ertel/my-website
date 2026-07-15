import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Youtube, Music2, Instagram, Send, Download, Lock } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { StatusBadge } from "../components/status-badge";
import { ClipPlayer } from "../components/clip-player";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../components/ui/select";

const PLATFORM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
};

const CAPTION_STYLES = ["modern", "gaming", "podcast", "minimal", "mrbeast", "hormozi"];
const FILTERS = ["none", "bw", "vintage", "vibrant", "cinematic"];
const EMOJI_POSITIONS = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"];
const RESOLUTIONS = ["720p", "1080p", "1440p"];
const CAPTION_POSITIONS = ["top", "middle", "bottom"];

export default function ClipDetail() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const me = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.billing.me.$get()).json(),
  });
  const hasEditorAccess = me.data?.limits.editor_access ?? false;

  const clip = useQuery({
    queryKey: ["clip", id],
    queryFn: async () => (await api.clips[":id"].$get({ param: { id: id! } })).json(),
    refetchInterval: (q) => (q.state.data?.clip?.status === "rendering" ? 2000 : false),
  });

  const accounts = useQuery({
    queryKey: ["social-accounts"],
    queryFn: async () => (await api.social.accounts.$get()).json(),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [accountId, setAccountId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [initialized, setInitialized] = useState(false);

  const [captionStyle, setCaptionStyle] = useState("modern");
  const [captionSize, setCaptionSize] = useState(20);
  const [captionText, setCaptionText] = useState("");
  const [captionPosition, setCaptionPosition] = useState("bottom");
  const [filter, setFilter] = useState("none");
  const [resolution, setResolution] = useState("1080p");
  const [emojis, setEmojis] = useState<{ emoji: string; position: string }[]>([]);
  const [newEmoji, setNewEmoji] = useState("");
  const [newEmojiPos, setNewEmojiPos] = useState("top-right");
  const [editInitialized, setEditInitialized] = useState(false);

  if (clip.data?.clip && !initialized) {
    setTitle(clip.data.clip.title);
    setDescription(clip.data.clip.description ?? "");
    setHashtags(JSON.parse(clip.data.clip.hashtags ?? "[]").join(", "));
    setInitialized(true);
  }

  if (clip.data?.clip && !editInitialized) {
    setCaptionStyle(clip.data.clip.captionStyle ?? "modern");
    setCaptionSize(clip.data.clip.captionSize ?? 20);
    setCaptionText(clip.data.clip.captionText ?? "");
    setCaptionPosition(clip.data.clip.captionPosition ?? "bottom");
    setFilter(clip.data.clip.filter ?? "none");
    setResolution(clip.data.clip.resolution ?? "1080p");
    setEmojis(clip.data.clip.emojis ? JSON.parse(clip.data.clip.emojis) : []);
    setEditInitialized(true);
  }

  const save = useMutation({
    mutationFn: async () =>
      api.clips[":id"].$patch({
        param: { id: id! },
        json: { title, description, hashtags: hashtags.split(",").map((h) => h.trim()).filter(Boolean) },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clip", id] }),
  });

  const reprocess = useMutation({
    mutationFn: async () => {
      const res = await api.clips[":id"].reprocess.$post({
        param: { id: id! },
        json: { captionStyle, captionSize, captionText, captionPosition, filter, resolution, emojis },
      });
      if (res.status === 403) {
        navigate("/pricing");
        throw new Error("Editor access requires a Pro or Business plan.");
      }
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clip", id] }),
  });

  const addEmoji = () => {
    if (!newEmoji.trim() || emojis.length >= 6) return;
    setEmojis([...emojis, { emoji: newEmoji.trim(), position: newEmojiPos }]);
    setNewEmoji("");
  };
  const removeEmoji = (i: number) => setEmojis(emojis.filter((_, idx) => idx !== i));

  const schedule = useMutation({
    mutationFn: async () =>
      api["scheduled-posts"].$post({
        json: {
          clipId: id!,
          socialAccountId: accountId,
          caption: title,
          hashtags: hashtags.split(",").map((h) => h.trim()).filter(Boolean),
          scheduledAt: new Date(scheduledAt || Date.now()).toISOString(),
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });

  const postNow = useMutation({
    mutationFn: async () =>
      api["scheduled-posts"].$post({
        json: {
          clipId: id!,
          socialAccountId: accountId,
          caption: title,
          hashtags: hashtags.split(",").map((h) => h.trim()).filter(Boolean),
          scheduledAt: new Date().toISOString(),
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });

  const handleSchedule = () => {
    const date = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(date.getTime()) || date.getTime() < Date.now()) {
      window.alert("Put a valid date");
      return;
    }
    schedule.mutate();
  };

  const c = clip.data?.clip;

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <div>
          <div className="glass-card overflow-hidden p-3">
            <div className="aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
              {c?.videoUrl && <ClipPlayer src={c.videoUrl} className="h-full w-full" />}
            </div>
          </div>
          {c && (
            <div className="mt-3 flex items-center justify-between px-1 text-sm text-muted-foreground">
              <span>Viral score: <span className="font-semibold text-primary">{c.viralScore}</span></span>
              <StatusBadge status={c.status} />
            </div>
          )}
          {c?.downloadUrl && (
            <a
              href={c.downloadUrl}
              download
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-semibold hover:bg-surface-strong"
            >
              <Download className="h-4 w-4" /> Download Clip
            </a>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Details</h2>
            <label className="mb-1 block text-xs text-muted-foreground">Title / Hook</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <label className="mb-1 block text-xs text-muted-foreground">Hashtags (comma separated)</label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={() => save.mutate()}
              className="mt-4 rounded-xl bg-gradient-neon px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              {save.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-1 font-display text-lg font-semibold">Edit Video</h2>
            {!hasEditorAccess ? (
              <>
                <p className="mb-4 text-xs text-muted-foreground">Editing captions, filters, and more is a Pro/Business feature.</p>
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted px-6 py-10 text-center">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">The video editor is locked on the Free plan</p>
                  <p className="text-xs text-muted-foreground">Upgrade to Pro or Business to edit captions, filters, resolution, and emojis.</p>
                  <Link
                    href="/pricing"
                    className="mt-2 rounded-xl bg-gradient-neon px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
                  >
                    Upgrade to Pro
                  </Link>
                </div>
              </>
            ) : (
              <>
            <p className="mb-4 text-xs text-muted-foreground">Re-renders the clip with your changes. Takes a few seconds.</p>

            <label className="mb-1 block text-xs text-muted-foreground">Caption Style</label>
            <Select value={captionStyle} onValueChange={setCaptionStyle}>
              <SelectTrigger className="mb-4 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="mb-1 block text-xs text-muted-foreground">Caption Size ({captionSize}px)</label>
            <input
              type="range"
              min={10}
              max={60}
              value={captionSize}
              onChange={(e) => setCaptionSize(Number(e.target.value))}
              className="mb-4 w-full"
            />

            <label className="mb-1 block text-xs text-muted-foreground">Caption Text</label>
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              rows={3}
              placeholder="What the burned-in captions say"
              className="mb-4 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />

            <label className="mb-1 block text-xs text-muted-foreground">Caption Location</label>
            <Select value={captionPosition} onValueChange={setCaptionPosition}>
              <SelectTrigger className="mb-4 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="mb-1 block text-xs text-muted-foreground">Filter</label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="mb-4 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="mb-1 block text-xs text-muted-foreground">Resolution</label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger className="mb-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="mb-1 block text-xs text-muted-foreground">Emojis (outline-style overlay, max 6)</label>
            <div className="mb-2 flex gap-2">
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                placeholder="😀"
                className="w-20 rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
              <Select value={newEmojiPos} onValueChange={setNewEmojiPos}>
                <SelectTrigger className="flex-1 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOJI_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p.replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={addEmoji}
                disabled={emojis.length >= 6}
                className="rounded-xl border border-border bg-muted px-4 py-2 text-sm hover:bg-surface-strong disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {emojis.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {emojis.map((e, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1 text-xs">
                    {e.emoji} <span className="capitalize text-muted-foreground">{e.position.replace("-", " ")}</span>
                    <button onClick={() => removeEmoji(i)} className="text-muted-foreground hover:text-[#FF4D4D]">×</button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => reprocess.mutate()}
              disabled={reprocess.isPending || c?.status === "rendering"}
              className="rounded-xl bg-gradient-neon px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
            >
              {c?.status === "rendering" ? "Re-rendering…" : "Re-render Clip"}
            </button>
            {reprocess.isSuccess && <p className="mt-3 text-sm text-[#2EFFB0]">Re-rendering started — this page updates automatically.</p>}
              </>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Schedule / Post</h2>
            {(accounts.data?.accounts ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No social accounts connected. <a href="/connections" className="text-primary hover:underline">Connect one</a> first.
              </p>
            ) : (
              <>
                <label className="mb-1 block text-xs text-muted-foreground">Account</label>
                <Select value={accountId || undefined} onValueChange={setAccountId}>
                  <SelectTrigger className="mb-4">
                    <SelectValue placeholder="Select account…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts.data?.accounts ?? []).map((a) => {
                      const Icon = PLATFORM_ICON[a.platform];
                      return (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-2">
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {a.platform} — {a.accountName}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <label className="mb-1 block text-xs text-muted-foreground">Publish at</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mb-4 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSchedule}
                    disabled={!accountId || c?.status !== "completed"}
                    className="flex items-center gap-2 rounded-xl bg-gradient-neon px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> {schedule.isPending ? "Scheduling…" : "Schedule Post"}
                  </button>
                  <button
                    onClick={() => postNow.mutate()}
                    disabled={!accountId || c?.status !== "completed"}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted px-5 py-2.5 text-sm font-semibold hover:bg-surface-strong disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> {postNow.isPending ? "Posting…" : "Post Now"}
                  </button>
                </div>
                {schedule.isSuccess && <p className="mt-3 text-sm text-[#2EFFB0]">Scheduled! Check the Scheduler page for status.</p>}
                {postNow.isSuccess && <p className="mt-3 text-sm text-[#2EFFB0]">Posted! Check the Scheduler page for status.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
