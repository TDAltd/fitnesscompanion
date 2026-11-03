import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { CheckCircle2, Copy, Download, Eye, Loader2, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { saveFile } from "@/lib/save-file";

type Status = {
  lastServer: string | null;
  lastOffsite: string | null;
  lastRestore: string | null;
  folder: string;
  copies: { name: string; bytes: number; at: string }[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(`/api/admin/backups${path}`), { credentials: "same-origin", ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
  return body as T;
}

const ago = (iso: string | null) => (iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "never");
const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const fresh = (iso: string | null) => !!iso && Date.now() - Date.parse(iso) < 36 * 3600 * 1000;

export function BackupsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery({ queryKey: ["admin-backups"], queryFn: () => api<Status>("") });
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const showKey = async () => setKey((await api<{ key: string }>("/key")).key);
  const backupNow = async () => {
    setBusy("now");
    try {
      const r = await api<{ name: string; bytes: number; rows: number }>("/now", { method: "POST" });
      toast({ title: "Backup saved on the server", description: `${r.rows.toLocaleString()} rows, ${size(r.bytes)}` });
      await qc.invalidateQueries({ queryKey: ["admin-backups"] });
    } catch (err) {
      toast({ title: "Backup failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };
  const download = async (name: string) => {
    setBusy(name);
    try {
      const res = await fetch(withBase(`/api/admin/backups/file/${encodeURIComponent(name)}`), { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await saveFile(new File([await res.blob()], name, { type: "application/octet-stream" }));
    } catch (err) {
      toast({ title: "Download failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const offsiteOk = fresh(data?.lastOffsite ?? null);
  return (
    <Card data-testid="backups-card">
      <CardHeader>
        <CardTitle className="text-lg">Backups</CardTitle>
        <CardDescription>Every account, every night, locked with your backup key.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <StatusRow ok={offsiteOk} title="GitHub (off the server)" detail={data?.lastOffsite ? `Last copy ${ago(data.lastOffsite)}` : "Not set up yet: see steps below"} />
          <StatusRow ok={fresh(data?.lastServer ?? null)} title="Server copy" detail={`Last copy ${ago(data?.lastServer ?? null)} · ${data?.copies.length ?? 0} kept`} />
        </div>

        <div className="space-y-2 rounded-xl border p-3">
          <p className="font-semibold">Your backup key</p>
          <p className="text-xs text-muted-foreground">
            It unlocks the backup files. Save it somewhere safe outside this app (your notes or password manager). If the server is ever lost, you'll need it to bring the data back.
          </p>
          {key ? (
            <div className="flex gap-2">
              <Input readOnly value={key} className="h-11 font-mono text-xs" data-testid="backup-key" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="outline" className="h-11 gap-1" onClick={() => void navigator.clipboard?.writeText(key).then(() => toast({ title: "Key copied" }))}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="h-11 gap-2" onClick={() => void showKey()} data-testid="button-show-backup-key">
              <Eye className="h-4 w-4" /> Show key
            </Button>
          )}
        </div>

        {!offsiteOk && (
          <details className="rounded-xl bg-muted/40 p-4" open={!data?.lastOffsite}>
            <summary className="cursor-pointer font-semibold">Turn on the nightly GitHub copy (once, about 3 minutes, on a computer)</summary>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>Tap <b>Show key</b> above and <b>Copy</b> it.</li>
              <li>
                Open <b>github.com/TDAltd/fitnesscompanion</b> → <b>Settings</b> → <b>Secrets and variables</b> → <b>Actions</b> → <b>New repository secret</b>.
              </li>
              <li>Name: <b>BACKUP_KEY</b>. Secret: paste the key. <b>Add secret</b>.</li>
              <li>
                Go to <b>Actions</b> → <b>Nightly database backup</b> → <b>Run workflow</b> to test it now. After about a minute, refresh this page: GitHub should turn green.
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Copies are under Actions → Nightly database backup → any run → Artifacts. GitHub keeps each for 14 days.</p>
          </details>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 gap-2" onClick={() => void backupNow()} disabled={!!busy} data-testid="button-backup-now">
            {busy === "now" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Back up now
          </Button>
          <Button variant="ghost" className="h-11 gap-2 text-destructive" onClick={() => setRestoreOpen(true)} data-testid="button-restore">
            <RotateCcw className="h-4 w-4" /> Restore a backup…
          </Button>
        </div>

        {!!data?.copies.length && (
          <details>
            <summary className="cursor-pointer font-semibold">Server copies ({data.copies.length})</summary>
            <ul className="mt-2 divide-y rounded-xl border">
              {data.copies.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 truncate text-xs">
                    {new Date(c.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {size(c.bytes)}
                  </span>
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => void download(c.name)} disabled={!!busy}>
                    {busy === c.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
      <RestoreDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
    </Card>
  );
}

function StatusRow({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl p-3 ${ok ? "bg-primary/10" : "bg-amber-100/60"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />}
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function RestoreDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await fetch(withBase("/api/admin/backups/restore"), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/octet-stream", "x-backup-key": key.trim(), "x-confirm": confirm.trim() },
        body: file,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      toast({ title: "Restored", description: `${body.rows.toLocaleString()} rows from ${new Date(body.from).toLocaleString("en-GB")}. Log in again.` });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({ title: "Restore failed", description: (err as Error).message, variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restore a backup</DialogTitle>
          <DialogDescription>
            This replaces everything in the app (every account, every log) with what's in the backup. A copy of the current data is saved on the server first, so you can undo it. Everyone, you included, will need to log in again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <input ref={fileRef} type="file" accept=".fcbk,application/octet-stream" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button variant="outline" className="h-11 w-full" onClick={() => fileRef.current?.click()}>
            {file ? file.name : "Choose the .fcbk backup file"}
          </Button>
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Backup key (fcb_…)" className="h-11 font-mono text-xs" />
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type RESTORE" className="h-11" />
        </div>
        <DialogFooter>
          <Button variant="destructive" className="h-11 gap-2" disabled={!file || !key.trim() || confirm.trim() !== "RESTORE" || busy} onClick={() => void run()} data-testid="button-run-restore">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Replace all data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
