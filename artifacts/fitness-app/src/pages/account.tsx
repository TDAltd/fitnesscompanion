import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Download, LogOut, Upload, Loader2, HeartPulse, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { AUTH_QUERY_KEY, importData, useAuthActions, useCurrentUser } from "@/lib/auth";

const TABLE_LABELS: Record<string, string> = {
  user_profile: "profile",
  weight_logs: "weight entries",
  workout_logs: "workouts",
  habit_logs: "habit days",
  meal_plan_entries: "meals",
  health_daily: "health days",
  exercise_sets: "exercise sets",
  body_measurements: "measurements",
};

export default function AccountPage() {
  const { data: user } = useCurrentUser();
  const { logout } = useAuthActions();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [, navigate] = useLocation();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const ok = window.confirm(
      "Importing replaces the data currently in this account with the data in the file. Continue?",
    );
    if (!ok) return;
    setImporting(true);
    try {
      const counts = await importData(file);
      const summary = Object.entries(counts)
        .map(([k, n]) => `${n} ${TABLE_LABELS[k] ?? k}`)
        .join(", ");
      // Refresh every screen's data, but keep the user logged in
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== AUTH_QUERY_KEY[0] });
      toast({ title: "Import complete", description: summary });
      if (counts.user_profile) navigate("/today");
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & data"
        description={<span data-testid="text-account-email">Logged in as {user?.email}</span>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Health devices</CardTitle>
          <CardDescription>Sync steps and active calories from your iPhone, watch or ring every night.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/connect-health" data-testid="link-account-connect-health">
              <HeartPulse className="h-4 w-4" /> Connect a device
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Back up your data</CardTitle>
          <CardDescription>Download everything in your account as a file you can keep or import later.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <a href={withBase("/api/export")} download data-testid="link-export">
              <Download className="h-4 w-4" /> Download backup
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import data</CardTitle>
          <CardDescription>
            Load a backup file, or the export from your old Replit app. This replaces what's currently in this account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json,.txt"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0])}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            className="gap-2"
            disabled={importing}
            onClick={() => fileInput.current?.click()}
            data-testid="button-import"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? "Importing…" : "Choose file"}
          </Button>
        </CardContent>
      </Card>

      <EmailSettings />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Privacy</CardTitle>
          <CardDescription>What we store, why, and your rights.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link href="/privacy">Read the privacy notice</Link></Button>
        </CardContent>
      </Card>

      <Button variant="ghost" className="gap-2" onClick={() => void logout()} data-testid="button-logout">
        <LogOut className="h-4 w-4" /> Log out
      </Button>

      <DeleteAccount />
    </div>
  );
}

type AccountSettings = { email: string; weeklyEmail: boolean; emailEnabled: boolean };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(path), { credentials: "same-origin", headers: { "content-type": "application/json" }, ...init });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data as T;
}

function EmailSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery({ queryKey: ["account-settings"], queryFn: () => call<AccountSettings>("/api/account/settings") });
  const save = useMutation({
    mutationFn: (weeklyEmail: boolean) => call("/api/account/settings", { method: "PUT", body: JSON.stringify({ weeklyEmail }) }),
    onSuccess: (_d, weeklyEmail) => {
      qc.setQueryData(["account-settings"], (old: AccountSettings | undefined) => (old ? { ...old, weeklyEmail } : old));
      toast({ title: weeklyEmail ? "Weekly summary on" : "Weekly summary off" });
    },
    onError: (e) => toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" }),
  });
  // Hidden until the app can actually send email
  if (!data || !data.emailEnabled) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Emails</CardTitle>
        <CardDescription>Sent to {data.email}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="weekly-email" className="cursor-pointer">
            <span className="block font-semibold">Weekly summary</span>
            <span className="block text-sm font-normal text-muted-foreground">Every Sunday: your workouts, food, steps, weight and milestones for the week.</span>
          </Label>
          <Switch
            id="weekly-email"
            checked={data.weeklyEmail}
            disabled={save.isPending}
            onCheckedChange={(v) => save.mutate(v)}
            data-testid="switch-weekly-email"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await call("/api/account", { method: "DELETE", body: JSON.stringify({ password }) });
      qc.clear();
      qc.setQueryData(AUTH_QUERY_KEY, null);
      window.location.href = withBase("/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="border-t pt-6">
      <p className="text-sm font-semibold">Delete my account</p>
      <p className="mt-1 text-sm text-muted-foreground">Permanently removes your account and everything in it. Download a backup first if you want to keep anything.</p>
      <Button variant="outline" className="mt-3 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setOpen(true)} data-testid="button-delete-account">
        <Trash2 className="h-4 w-4" /> Delete my account
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPassword(""); setError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Your profile, workouts, meals, weights, measurements and health data are deleted straight away. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (password) void remove(); }} className="space-y-2">
            <Label htmlFor="delete-password">Enter your password to confirm</Label>
            <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-delete-password" />
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={!password || busy} data-testid="button-confirm-delete">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete everything
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
