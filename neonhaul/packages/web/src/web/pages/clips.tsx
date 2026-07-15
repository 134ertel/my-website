import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";
import { ClipCard } from "../components/clip-card";

export default function Clips() {
  const clips = useQuery({
    queryKey: ["clips"],
    queryFn: async () => (await api.clips.$get()).json(),
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Clips</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every clip Clipzy's AI has generated for you.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(clips.data?.clips ?? []).length === 0 && <p className="text-sm text-muted-foreground">No clips yet — upload a video to get started.</p>}
        {(clips.data?.clips ?? []).map((c) => (
          <ClipCard key={c.id} clip={c} />
        ))}
      </div>
    </AppShell>
  );
}
