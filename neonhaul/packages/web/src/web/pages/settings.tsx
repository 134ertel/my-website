import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { AppShell } from "../components/layout/app-shell";
import { authClient } from "../lib/auth";
import { api } from "../lib/api";
import { useTheme } from "../hooks/use-theme";

export default function Settings() {
  const { data: session, refetch } = authClient.useSession();
  const me = useQuery({
    queryKey: ["billing-me"],
    queryFn: async () => (await api.billing.me.$get()).json(),
  });
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [nameInitialized, setNameInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (session?.user && !nameInitialized) {
    setName(session.user.name);
    setNameInitialized(true);
  }

  const saveName = async () => {
    if (!name.trim() || name === session?.user?.name) return;
    setSaving(true);
    setSaved(false);
    try {
      await authClient.updateUser({ name: name.trim() });
      await refetch?.();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <div className="mt-6 max-w-xl space-y-6">
        <div className="glass-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Account</h2>

          <label className="mb-1 block text-xs text-muted-foreground">Name</label>
          <div className="mb-4 flex gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={saveName}
              disabled={saving || !name.trim() || name === session?.user?.name}
              className="rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-medium hover:bg-surface-strong disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {saved && <p className="mb-4 -mt-2 text-xs text-[#2EFFB0]">Name updated.</p>}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Email</span>
              <span>{session?.user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="capitalize">{me.data?.planId ?? "free"}</span>
            </div>
          </div>

          <button
            onClick={() => authClient.signOut().then(() => (window.location.href = "/"))}
            className="mt-6 rounded-xl border border-border bg-muted px-4 py-2 text-sm hover:bg-surface-strong"
          >
            Sign out
          </button>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-1 font-display text-lg font-semibold">Appearance</h2>
          <p className="mb-4 text-xs text-muted-foreground">Choose how Clipzy looks on this device.</p>

          <div className="flex gap-3">
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                theme === "dark" ? "border-primary/50 bg-muted glow-border" : "border-border bg-muted hover:bg-surface-strong"
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition ${
                theme === "light" ? "border-primary/50 bg-muted glow-border" : "border-border bg-muted hover:bg-surface-strong"
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
