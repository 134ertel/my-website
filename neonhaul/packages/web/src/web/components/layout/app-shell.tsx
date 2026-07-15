import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Film, Clapperboard, CalendarClock, Link2, Settings, LogOut, Sparkles, Lightbulb,
} from "lucide-react";
import { authClient } from "../../lib/auth";
import { Logo } from "../logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: Film },
  { href: "/clips", label: "Clips", icon: Clapperboard },
  { href: "/scheduler", label: "Scheduler", icon: CalendarClock },
  { href: "/connections", label: "Connections", icon: Link2 },
  { href: "/pricing", label: "Pricing", icon: Sparkles },
  { href: "/feature-requests", label: "Feature Requests", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: session } = authClient.useSession();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground">
        <Link href="/dashboard" className="mb-8 px-2">
          <Logo />
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground glow-border"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "group-hover:text-primary"} transition-colors`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-2 px-2 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session?.user?.name ?? "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => authClient.signOut().then(() => (window.location.href = "/"))}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
