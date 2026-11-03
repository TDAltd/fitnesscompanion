import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, BookOpen, Bug, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuthActions, useCurrentUser } from "@/lib/auth";
import { useAdminAlerts } from "@/lib/admin-alerts";
import { cn } from "@/lib/utils";
import AdminPage, { type AdminSection } from "@/pages/admin";

const NAV: { id: AdminSection; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "people", label: "People", icon: Users },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "problems", label: "Problems", icon: Bug },
  { id: "content", label: "Recipes", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
];
const href = (id: AdminSection) => (id === "overview" ? "/admin" : `/admin/${id}`);

/** Admin accounts are admin-only: no tracking screens, just the admin sections. */
export function AdminShell() {
  const { data: user } = useCurrentUser();
  const { logout } = useAuthActions();
  const [location, navigate] = useLocation();
  const alerts = useAdminAlerts();

  const match = location.match(/^\/admin\/?([a-z]*)/);
  const section = (NAV.find((n) => n.id === match?.[1])?.id ?? "overview") as AdminSection;

  useEffect(() => {
    // Old links (e.g. the daily email's /admin#problems) and any non-admin address
    if (window.location.hash === "#problems") navigate("/admin/problems", { replace: true });
    else if (!match) navigate("/admin", { replace: true });
  }, [match, navigate]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Phones: keep the open section's tab in view
    document.querySelector('[data-testid="admin-tabs"] [aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [section]);

  const badge = (id: AdminSection) =>
    id === "problems" && alerts.openProblems > 0 ? (
      <span className="ml-auto rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-5 text-destructive-foreground md:ml-auto">{alerts.openProblems}</span>
    ) : id === "settings" && alerts.offsiteOk === false ? (
      <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" aria-label="Needs setting up" />
    ) : null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-10">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-dusk/15 px-2.5 py-0.5 text-xs font-semibold text-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => void logout()} data-testid="button-admin-logout">
              <LogOut className="h-4 w-4" /> Log out
            </Button>
          </div>
        </div>
        {/* Phones: sections as a row of tabs */}
        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden" aria-label="Admin sections" data-testid="admin-tabs">
          {NAV.map((n) => (
            <Link
              key={n.id}
              href={href(n.id)}
              aria-current={section === n.id ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold",
                section === n.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground",
              )}
            >
              <n.icon className="h-4 w-4" /> {n.label}
              {badge(n.id)}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-6 md:px-10 md:py-10">
        {/* Computers: a sidebar */}
        <nav className="sticky top-28 hidden h-fit w-52 shrink-0 space-y-1 md:block" aria-label="Admin sections">
          {NAV.map((n) => (
            <Link
              key={n.id}
              href={href(n.id)}
              aria-current={section === n.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                section === n.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              <n.icon className="h-4 w-4" /> {n.label}
              {badge(n.id)}
            </Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">
          <AdminPage section={section} />
        </main>
      </div>
    </div>
  );
}
