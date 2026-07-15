import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { ClipCard } from "../components/clip-card";

const STEPS = [
  { key: "uploaded", label: "Uploading" },
  { key: "downloading", label: "Preparing Video" },
  { key: "transcribing", label: "Transcribing" },
  { key: "analyzing", label: "Understanding Context" },
  { key: "editing", label: "Detecting Viral Moments" },
  { key: "rendering", label: "Rendering Clips" },
  { key: "completed", label: "Ready" },
];

export default function ProjectDetail() {
  const { id } = useParams();

  const project = useQuery({
    queryKey: ["project", id],
    queryFn: async () => (await api.projects[":id"].$get({ param: { id: id! } })).json(),
    refetchInterval: (q) => (["completed", "failed", "cancelled"].includes(q.state.data?.project?.status ?? "") ? false : 3000),
  });

  const clips = useQuery({
    queryKey: ["project-clips", id],
    queryFn: async () => (await api.projects[":id"].clips.$get({ param: { id: id! } })).json(),
    enabled: project.data?.project?.status === "completed",
  });

  const cancel = useMutation({
    mutationFn: async () => api.projects[":id"].cancel.$post({ param: { id: id! } }),
    onSuccess: () => project.refetch(),
  });

  const p = project.data?.project;
  const currentIndex = STEPS.findIndex((s) => s.key === p?.status);
  const isActive = p && !["completed", "failed", "cancelled"].includes(p.status);

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">{p?.title ?? "Loading…"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {p?.durationSeconds ? `${Math.round(p.durationSeconds)}s source video` : "Source video"}
      </p>

      {p && p.status !== "completed" && (
        <div className="mt-6 glass-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">AI Processing</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{p.progress}%</span>
              {isActive && (
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium hover:bg-surface-strong disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              )}
            </div>
          </div>
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-strong">
            <div className="h-full bg-gradient-neon transition-all" style={{ width: `${p.progress}%` }} />
          </div>

          {p.status !== "cancelled" && (
            <div className="space-y-3">
              {STEPS.map((s, i) => {
                const done = p.status === "failed" ? i < currentIndex : i < currentIndex || p.status === "completed";
                const active = i === currentIndex && p.status !== "failed";
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        done ? "border-[#2EFFB0] bg-[#2EFFB0]/15" : active ? "border-[#00E5FF] bg-[#00E5FF]/15" : "border-border bg-muted"
                      }`}
                    >
                      {done ? (
                        <Check className="h-3.5 w-3.5 text-[#2EFFB0]" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00E5FF]" />
                      ) : null}
                    </div>
                    <span className={`text-sm ${done || active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {p.status === "failed" && (
            <div className="mt-5 rounded-xl border border-[#FF4D4D]/30 bg-[#FF4D4D]/10 p-4">
              <p className="text-sm text-[#FF4D4D]">{p.errorMessage ?? "Something went wrong."}</p>
              <button
                onClick={async () => {
                  await api.projects[":id"].retry.$post({ param: { id: id! } });
                  project.refetch();
                }}
                className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2 text-sm hover:bg-surface-strong"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          {p.status === "cancelled" && (
            <div className="mt-5 rounded-xl border border-border bg-muted p-4">
              <p className="text-sm text-muted-foreground">Processing was cancelled.</p>
              <button
                onClick={async () => {
                  await api.projects[":id"].retry.$post({ param: { id: id! } });
                  project.refetch();
                }}
                className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2 text-sm hover:bg-surface-strong"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      )}

      {p?.status === "completed" && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-lg font-semibold">Clips ({clips.data?.clips?.length ?? 0})</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(clips.data?.clips ?? []).map((c) => (
              <ClipCard key={c.id} clip={c} />
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
