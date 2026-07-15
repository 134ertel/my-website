import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Youtube, Music2, Instagram, Send, Trash2 } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { StatusBadge } from "../components/status-badge";

const PLATFORM_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
};

export default function Scheduler() {
  const qc = useQueryClient();
  const posts = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: async () => (await api["scheduled-posts"].$get()).json(),
    refetchInterval: 8000,
  });

  const postNow = useMutation({
    mutationFn: async (id: string) => api["scheduled-posts"][":id"]["post-now"].$post({ param: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api["scheduled-posts"][":id"].$delete({ param: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled-posts"] }),
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Scheduler</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage upcoming and published posts. Schedule clips from any clip's detail page.</p>

      <div className="mt-6 glass-card divide-y divide-border">
        {(posts.data?.posts ?? []).length === 0 && <p className="p-6 text-sm text-muted-foreground">Nothing scheduled yet.</p>}
        {(posts.data?.posts ?? []).map((p) => {
          const Icon = PLATFORM_ICON[p.platform] ?? Send;
          return (
            <div key={p.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{p.caption || "Untitled post"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{new Date(p.scheduledAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={p.status} />
                {p.status === "scheduled" && (
                  <button onClick={() => postNow.mutate(p.id)} className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs hover:bg-surface-strong">
                    Post Now
                  </button>
                )}
                <button onClick={() => remove.mutate(p.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-strong hover:text-[#FF4D4D]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
