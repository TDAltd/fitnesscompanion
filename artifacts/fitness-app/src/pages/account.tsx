import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, LogOut, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AUTH_QUERY_KEY, importData, useAuthActions, useCurrentUser } from "@/lib/auth";

const TABLE_LABELS: Record<string, string> = {
  user_profile: "profile",
  weight_logs: "weight entries",
  workout_logs: "workouts",
  habit_logs: "habit days",
  meal_plan_entries: "meals",
  body_measurements: "measurements",
};

export default function AccountPage() {
  const { data: user } = useCurrentUser();
  const { logout } = useAuthActions();
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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
      <div>
        <h1 className="text-3xl font-black tracking-tight">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="text-account-email">
          Logged in as {user?.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Back up your data</CardTitle>
          <CardDescription>Download everything in your account as a file you can keep or import later.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="gap-2">
            <a href="/api/export" download data-testid="link-export">
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

      <Button variant="ghost" className="gap-2 text-destructive" onClick={() => void logout()} data-testid="button-logout">
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </div>
  );
}
