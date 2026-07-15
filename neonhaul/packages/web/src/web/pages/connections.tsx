import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Youtube, Music2, Instagram, Trash2, Lock } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { api } from "../lib/api";

const PLATFORMS = [
  { id: "youtube", label: "YouTube", icon: Youtube, color: "#FF0000" },
  { id: "tiktok", label: "TikTok", icon: Music2, color: "#00E5FF", comingSoon: true },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#FF2ED1", comingSoon: true },
] as const;

export default function Connections() {
  const qc = useQueryClient();
  const params = new URLSearchParams(window.location.search);

  const me = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.billing.me.$get()).json(),
  });
  const hasSocialPosting = me.data?.limits.social_posting ?? false;

  const data = useQuery({
    queryKey: ["social-accounts"],
    queryFn: async () => (await api.social.accounts.$get()).json(),
  });

  // The OAuth flow opens in a real top-level tab (some platforms like TikTok refuse to load
  // inside any iframe). Refetch connected accounts whenever this tab regains focus so a
  // successful connect in the other tab shows up here without a manual reload.
  useEffect(() => {
    const onFocus = () => qc.invalidateQueries({ queryKey: ["social-accounts"] });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [qc]);

  const connect = useMutation({
    mutationFn: async (platform: string) => {
      const res = await api.social[":platform"].connect.$get({ param: { platform } });
      const json = await res.json();
      if (!res.ok) throw new Error(("message" in json && json.message) || "Failed to start connection");
      return json;
    },
    onSuccess: (json) => {
      if ("url" in json) window.open(json.url, "_blank", "noopener,noreferrer");
    },
  });

  const disconnect = useMutation({
    mutationFn: async (id: string) => api.social.accounts[":id"].$delete({ param: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-accounts"] }),
  });

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Connections</h1>
      <p className="mt-1 text-sm text-muted-foreground">Connect your social accounts to auto-post clips.</p>

      {params.get("connected") && (
        <div className="mt-4 rounded-xl border border-[#2EFFB0]/30 bg-[#2EFFB0]/10 p-3 text-sm text-[#2EFFB0]">
          {params.get("connected")} connected successfully.
        </div>
      )}
      {params.get("error") && (
        <div className="mt-4 rounded-xl border border-[#FF4D4D]/30 bg-[#FF4D4D]/10 p-3 text-sm text-[#FF4D4D]">{params.get("error")}</div>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const configured = data.data?.configured?.[platform.id];
          const connected = (data.data?.accounts ?? []).filter((a) => a.platform === platform.id);
          const locked = !platform.comingSoon && !hasSocialPosting;
          return (
            <div key={platform.id} className="glass-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <platform.icon className="h-5 w-5" style={{ color: platform.color }} />
                </div>
                <h3 className="font-display text-lg font-semibold">{platform.label}</h3>
                {platform.comingSoon && (
                  <span className="ml-auto rounded-full bg-[#FFC72E]/15 px-2.5 py-1 text-xs font-medium text-[#FFC72E]">Coming Soon</span>
                )}
                {locked && (
                  <span className="ml-auto rounded-full bg-gradient-neon px-2.5 py-1 text-xs font-bold text-black">Pro</span>
                )}
              </div>

              {platform.comingSoon ? (
                <p className="mb-3 text-sm text-muted-foreground">{platform.label} integration is coming soon.</p>
              ) : locked ? (
                <div className="mb-3 flex flex-col items-center gap-2 rounded-xl border border-border bg-muted px-4 py-8 text-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Connecting {platform.label} to auto-post requires Pro or Business.</p>
                </div>
              ) : connected.length > 0 ? (
                <div className="space-y-2">
                  {connected.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-2">
                      <span className="text-sm">{a.accountName}</span>
                      <button onClick={() => disconnect.mutate(a.id)} className="text-muted-foreground hover:text-[#FF4D4D]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground">Not connected.</p>
              )}

              {locked ? (
                <Link
                  href="/pricing"
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-neon py-2.5 text-sm font-semibold text-black hover:opacity-90"
                >
                  Upgrade to Connect
                </Link>
              ) : (
                <button
                  onClick={() => connect.mutate(platform.id)}
                  disabled={platform.comingSoon}
                  className="mt-4 w-full rounded-xl border border-border bg-muted py-2.5 text-sm font-medium hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-muted"
                >
                  {platform.comingSoon ? "Coming Soon" : connected.length > 0 ? "Connect another" : "Connect"}
                </button>
              )}
              {!platform.comingSoon && !locked && configured === false && (
                <p className="mt-2 text-xs text-[#FFC72E]">
                  Needs {platform.label} developer API credentials configured by the app owner first.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
