import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Film, Clapperboard, CalendarClock, TrendingUp, Upload } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { StatusBadge } from "../components/status-badge";

export default function Dashboard() {
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await api.projects.$get()).json(),
  });
  const clips = useQuery({
    queryKey: ["clips"],
    queryFn: async () => (await api.clips.$get()).json(),
  });
  const posts = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: async () => (await api["scheduled-posts"].$get()).json(),
  });

  const stats = [
    { label: "Videos Uploaded", value: projects.data?.projects?.length ?? 0, icon: Film },
    { label: "AI Clips Generated", value: clips.data?.clips?.length ?? 0, icon: Clapperboard },
    { label: "Scheduled Posts", value: posts.data?.posts?.filter((p) => p.status === "scheduled").length ?? 0, icon: CalendarClock },
    { label: "Posts Published", value: posts.data?.posts?.filter((p) => p.status === "posted").length ?? 0, icon: TrendingUp },
  ];

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your clip factory at a glance.</p>
        </div>
        <Link href="/upload" className="flex items-center gap-2 rounded-xl bg-gradient-neon px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90">
          <Upload className="h-4 w-4" /> New Project
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <s.icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-display text-lg font-semibold">Recent Projects</h2>
        <div className="glass-card divide-y divide-border">
          {(projects.data?.projects ?? []).length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No projects yet. Upload your first video to get started.</p>
          )}
          {(projects.data?.projects ?? []).slice(0, 6).map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-muted">
              <div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
