import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, Youtube, Loader2 } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { StatusBadge } from "../components/status-badge";

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

export default function Projects() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const me = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.billing.me.$get()).json(),
  });
  const maxDurationSeconds = me.data?.limits.maxDurationSeconds ?? 600;
  const upgradeMessage = me.data?.limits.upgradeMessage ?? "This video is longer than 10 minutes. Upgrade to Pro or Business to process longer videos.";

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.projects.$get()).json(),
    refetchInterval: 5000,
  });

  const create = useMutation({
    mutationFn: async () => {
      setBusy(true);
      setError("");
      let sourceKey: string | undefined;
      let durationSeconds: number | undefined;

      if (mode === "upload") {
        if (!file) throw new Error("Choose a video file first");
        durationSeconds = await readVideoDurationSeconds(file);
        if (durationSeconds > maxDurationSeconds) {
          throw new Error(upgradeMessage);
        }
        const presign = await api.upload.presign.$post({ json: { filename: file.name, contentType: file.type } });
        const { url, key } = await presign.json();
        await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        sourceKey = key;
      } else if (!youtubeUrl) {
        throw new Error("Paste a YouTube URL first");
      }

      const res = await api.projects.$post({
        json: {
          title: title || (mode === "upload" ? file?.name ?? "Untitled" : "YouTube Import"),
          sourceType: mode === "upload" ? "upload" : "youtube",
          sourceKey,
          sourceUrl: mode === "youtube" ? youtubeUrl : undefined,
          durationSeconds,
        },
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to create project");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${data.id}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Something went wrong";
      setError(message);
      window.alert(message);
    },
    onSettled: () => setBusy(false),
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload a video or paste a link — Clipzy does the rest.</p>

      <div className="mt-6 glass-card p-6">
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("upload")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "upload" ? "bg-gradient-neon text-black" : "border border-border text-muted-foreground"}`}
          >
            Upload File
          </button>
          <button
            onClick={() => setMode("youtube")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${mode === "youtube" ? "bg-gradient-neon text-black" : "border border-border text-muted-foreground"}`}
          >
            YouTube / URL
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title (optional)"
          className="mb-4 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
        />

        {mode === "upload" ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted py-14 text-center hover:border-primary/40">
            <Upload className="mb-3 h-8 w-8 text-primary" />
            <p className="text-sm font-medium">{file ? file.name : "Drag & drop or click to upload"}</p>
            <p className="mt-1 text-xs text-muted-foreground">MP4, MOV, MKV, AVI</p>
            <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3">
            <Youtube className="h-5 w-5 text-[#FF2ED1]" />
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[#FF4D4D]">{error}</p>}

        <button
          onClick={() => create.mutate()}
          disabled={busy}
          className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-neon px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Start AI Processing
        </button>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">All Projects</h2>
      <div className="glass-card divide-y divide-border">
        {(projects.data?.projects ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">No projects yet.</p>}
        {(projects.data?.projects ?? []).map((p) => (
          <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted">
            <div>
              <p className="text-sm font-medium">{p.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              {["uploaded", "downloading", "transcribing", "analyzing", "editing", "rendering"].includes(p.status) && (
                <span className="text-xs text-muted-foreground">{p.progress}%</span>
              )}
              <StatusBadge status={p.status} />
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
