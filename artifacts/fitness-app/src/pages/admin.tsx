import { useMemo, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Copy, KeyRound, Search, ShieldCheck, ShieldOff, Trash2, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdminAction, useAdminOverview, useAdminUsers, type AdminUser } from "@/lib/admin";
import { useCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Active this week", "Admins", "Disabled"] as const;
type Filter = (typeof FILTERS)[number];

const ago = (iso: string | null) => (iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "never");

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl font-medium tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const { data: me } = useCurrentUser();
  const { data: overview, isLoading } = useAdminOverview();
  const { data: users } = useAdminUsers();
  const action = useAdminAction();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      if (q && !u.email.toLowerCase().includes(q) && !(u.name ?? "").toLowerCase().includes(q)) return false;
      if (filter === "Admins") return u.isAdmin;
      if (filter === "Disabled") return u.disabled;
      if (filter === "Active this week") return u.lastActiveAt != null && parseISO(u.lastActiveAt).getTime() >= weekAgo;
      return true;
    });
  }, [users, query, filter, weekAgo]);

  const selected = users?.find((u) => u.id === selectedId) ?? null;

  const toggleSignups = async (open: boolean) => {
    try {
      await action.mutateAsync({ path: "/settings", method: "PUT", body: { signupsOpen: open } });
      toast({ title: open ? "Sign-ups opened" : "Sign-ups closed", description: open ? "New people can create accounts." : "Existing users can still log in." });
    } catch (err) {
      toast({ title: "Couldn't change sign-ups", description: (err as Error).message, variant: "destructive" });
    }
  };

  if (me && me.isAdmin === false) {
    return <PageHeader title="Admin" description="You don't have access to this page." />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Admin"
        description="Who's using Fitness Companion and which parts they use. Admin accounts aren't counted. Weights, meals and health numbers stay private."
        action={
          overview && (
            <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
              <Switch id="signups" checked={overview.signupsOpen} onCheckedChange={toggleSignups} disabled={action.isPending} data-testid="switch-signups" />
              <Label htmlFor="signups" className="cursor-pointer text-sm font-semibold">
                {overview.signupsOpen ? "Sign-ups open" : "Sign-ups closed"}
              </Label>
            </div>
          )
        }
      />

      {isLoading || !overview ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4" data-testid="admin-stats">
            <Stat label="People" value={overview.totals.users} sub={`${overview.totals.new7d} joined this week`} />
            <Stat label="Active today" value={overview.totals.active1d} />
            <Stat label="Active this week" value={overview.totals.active7d} />
            <Stat label="Active this month" value={overview.totals.active30d} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sign-ups</CardTitle>
              <CardDescription>New accounts per day, last 30 days ({overview.totals.new30d} in total)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.signups} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => format(parseISO(d), "d MMM")}
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      labelFormatter={(d: string) => format(parseISO(d), "EEE d MMM")}
                      formatter={(v: number) => [v, "Sign-ups"]}
                      contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Feature use</CardTitle>
                <CardDescription>Share of all {overview.totals.users} people who have used each part at least once</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3" data-testid="feature-use">
                  {overview.features.map((f) => (
                    <li key={f.key}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold">{f.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {f.users} · {f.percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(f.percent, f.users > 0 ? 2 : 0)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Retention</CardTitle>
                <CardDescription>Of people who joined long enough ago, how many came back later</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {overview.retention.map((r) => (
                  <div key={r.days}>
                    <p className="text-sm font-semibold">Still using it after {r.days === 7 ? "1 week" : "4 weeks"}</p>
                    {r.cohort === 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Not enough history yet: shows once people joined at least {r.days} days ago.
                      </p>
                    ) : (
                      <p className="mt-1">
                        <span className="font-display text-3xl font-medium tabular-nums">{r.percent}%</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          {r.retained} of {r.cohort} people
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* People */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">People</CardTitle>
          <CardDescription>Tap someone to see their usage, reset a password, or manage their account.</CardDescription>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
                data-testid="input-admin-search"
              />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter people">
              {FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!users ? (
            <div className="p-5"><Skeleton className="h-40" /></div>
          ) : shown.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No one matches that search.</p>
          ) : (
            <ul className="divide-y border-t" data-testid="admin-user-list">
              {shown.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className="grid w-full grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-muted/50 md:grid-cols-[auto_1.6fr_1fr_1fr_1.3fr]"
                    data-testid={`admin-user-${u.id}`}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold",
                        u.disabled ? "bg-muted text-muted-foreground" : "bg-sage text-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("truncate font-semibold", u.disabled && "text-muted-foreground line-through")}>
                          {u.name ?? u.email.split("@")[0]}
                        </span>
                        {u.isAdmin && <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">Admin</span>}
                        {u.disabled && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">Disabled</span>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                    </span>
                    <span className="col-start-2 text-xs text-muted-foreground md:col-start-auto md:text-sm">
                      Joined {u.createdAt ? format(parseISO(u.createdAt), "d MMM yyyy") : "?"}
                    </span>
                    <span className="col-start-2 text-xs text-muted-foreground md:col-start-auto md:text-sm">Active {ago(u.lastActiveAt)}</span>
                    <span className="col-start-2 truncate text-xs text-muted-foreground md:col-start-auto md:text-sm">
                      {[u.profile.goal, u.usage.appleHealth ? "Apple Health" : null].filter(Boolean).join(" / ") || "Hasn't finished setup"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <UserDialog user={selected} meId={me?.id} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function UserDialog({ user, meId, onClose }: { user: AdminUser | null; meId?: number; onClose: () => void }) {
  const action = useAdminAction();
  const { toast } = useToast();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");
  const isMe = user?.id === meId;

  const close = () => {
    setTempPassword(null);
    setConfirmDelete(false);
    setTypedEmail("");
    onClose();
  };

  const run = async (label: string, path: string, method = "POST", body?: unknown) => {
    try {
      const result = await action.mutateAsync({ path, method, body });
      return result;
    } catch (err) {
      toast({ title: `Couldn't ${label}`, description: (err as Error).message, variant: "destructive" });
      return null;
    }
  };

  if (!user) return null;

  const usage = [
    ["Days active", user.usage.activeDays],
    ["Meals planned", user.usage.meals],
    ["Workouts logged", user.usage.workouts],
    ["Weigh-ins", user.usage.weighIns],
    ["Checklist days", user.usage.habitDays],
    ["AI meal estimates", user.usage.aiEstimates],
  ] as const;

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display font-medium">{user.name ?? user.email.split("@")[0]}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-muted/50 p-4 text-sm">
          <dt className="text-muted-foreground">Joined</dt>
          <dd>{user.createdAt ? format(parseISO(user.createdAt), "d MMM yyyy") : "?"}</dd>
          <dt className="text-muted-foreground">Last active</dt>
          <dd>{ago(user.lastActiveAt)}</dd>
          <dt className="text-muted-foreground">Goal</dt>
          <dd>{user.profile.goal ?? "Not set"}</dd>
          <dt className="text-muted-foreground">Trains</dt>
          <dd>
            {user.profile.daysPerWeek ? `${user.profile.daysPerWeek} days a week` : "Not set"}
            {user.profile.location ? `, ${user.profile.location.toLowerCase()}` : ""}
          </dd>
          <dt className="text-muted-foreground">Experience</dt>
          <dd>{user.profile.experience ?? "Not set"}</dd>
          <dt className="text-muted-foreground">Apple Health</dt>
          <dd>{user.usage.appleHealth ? "Connected" : "Not connected"}</dd>
        </dl>

        <div className="grid grid-cols-3 gap-2">
          {usage.map(([label, n]) => (
            <div key={label} className="rounded-xl border p-3">
              <p className="font-display text-xl font-medium tabular-nums">{n}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {tempPassword && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-semibold">Temporary password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-card px-3 py-2 text-base" data-testid="text-temp-password">{tempPassword}</code>
              <Button size="icon" variant="outline" aria-label="Copy password" onClick={() => void navigator.clipboard?.writeText(tempPassword)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">
              Send this to {user.email} privately. They've been logged out everywhere; they can log in with it now.
            </p>
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={action.isPending}
            data-testid="button-reset-password"
            onClick={async () => {
              const r = await run("reset the password", `/users/${user.id}/reset-password`);
              if (r?.tempPassword) setTempPassword(String(r.tempPassword));
            }}
          >
            <KeyRound className="h-4 w-4" /> Reset password
          </Button>

          {!isMe && !user.adminFromSettings && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={action.isPending}
              data-testid="button-toggle-admin"
              onClick={async () => {
                if (
                  !user.isAdmin &&
                  !window.confirm(
                    `Make ${user.email} an admin? Admin accounts only see this dashboard: they can't track their own fitness with this account.`,
                  )
                )
                  return;
                const r = await run("change admin access", `/users/${user.id}/role`, "POST", { role: user.isAdmin ? "user" : "admin" });
                if (r) toast({ title: user.isAdmin ? "Admin access removed" : "Now an admin" });
              }}
            >
              {user.isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {user.isAdmin ? "Remove admin access" : "Make admin"}
            </Button>
          )}
          {user.adminFromSettings && (
            <p className="px-1 text-xs text-muted-foreground">Admin through the ADMIN_EMAILS setting in cPanel.</p>
          )}

          {!isMe && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={action.isPending}
              data-testid="button-toggle-disabled"
              onClick={async () => {
                const r = await run(user.disabled ? "enable the account" : "disable the account", `/users/${user.id}/${user.disabled ? "enable" : "disable"}`);
                if (r) toast({ title: user.disabled ? "Account enabled" : "Account disabled", description: user.disabled ? undefined : "They've been logged out and can't log in." });
              }}
            >
              {user.disabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
              {user.disabled ? "Enable account" : "Disable account"}
            </Button>
          )}

          {!isMe &&
            (confirmDelete ? (
              <div className="space-y-2 rounded-xl border border-destructive/40 p-3">
                <p className="text-sm">
                  This permanently deletes {user.email} and all their data. Type their email to confirm.
                </p>
                <Input value={typedEmail} onChange={(e) => setTypedEmail(e.target.value)} placeholder={user.email} data-testid="input-confirm-delete" />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    disabled={typedEmail.trim().toLowerCase() !== user.email || action.isPending}
                    data-testid="button-confirm-delete"
                    onClick={async () => {
                      const r = await run("delete the account", `/users/${user.id}`, "DELETE", { confirmEmail: user.email });
                      if (r) {
                        toast({ title: "Account deleted" });
                        close();
                      }
                    }}
                  >
                    Delete permanently
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                data-testid="button-delete-user"
              >
                <Trash2 className="h-4 w-4" /> Delete account
              </Button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
