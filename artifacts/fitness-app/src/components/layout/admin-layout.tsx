import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuthActions, useCurrentUser } from "@/lib/auth";
import AdminPage from "@/pages/admin";

/** Admin accounts are admin-only: no tracking screens, just the dashboard. */
export function AdminShell() {
  const { data: user } = useCurrentUser();
  const { logout } = useAuthActions();
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
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
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-10 md:py-10">
        <AdminPage />
      </main>
    </div>
  );
}
