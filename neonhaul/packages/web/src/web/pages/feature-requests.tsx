import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";

export default function FeatureRequests() {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const requests = useQuery({
    queryKey: ["feature-requests"],
    queryFn: async () => (await api["feature-requests"].$get()).json(),
  });

  const submit = useMutation({
    mutationFn: async () => api["feature-requests"].$post({ json: { text: text.trim() } }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["feature-requests"] });
    },
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Feature Requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tell us what you'd like to see added to Clipzy next.</p>

      <div className="mt-6 glass-card max-w-2xl p-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What would you like us to add?"
          className="w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
        />
        <button
          onClick={() => submit.mutate()}
          disabled={!text.trim() || submit.isPending}
          className="mt-4 rounded-xl bg-gradient-neon px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-40"
        >
          {submit.isPending ? "Submitting…" : "Submit"}
        </button>
        {submit.isSuccess && <p className="mt-3 text-sm text-[#2EFFB0]">Thanks! We read every suggestion.</p>}
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">What others are asking for</h2>
      <div className="glass-card max-w-2xl divide-y divide-border">
        {(requests.data?.requests ?? []).length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No suggestions yet — be the first.</p>
        )}
        {(requests.data?.requests ?? []).map((r) => (
          <div key={r.id} className="flex gap-3 px-5 py-4">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm">{r.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {r.authorName ?? "Anonymous"} · {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
