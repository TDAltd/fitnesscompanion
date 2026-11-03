import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Bug, CheckCircle2, Mail, RotateCcw, Smartphone, Server, HeartPulse, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type Problem = {
  id: number;
  source: "app" | "server" | "health-sync";
  message: string;
  detail: string | null;
  page: string | null;
  userAgent: string | null;
  count: number;
  people: number;
  firstSeen: string;
  lastSeen: string;
  resolvedAt: string | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(`/api/admin/errors${path}`), {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
  return body as T;
}

const SOURCE = {
  app: { label: "In the app", icon: Smartphone },
  server: { label: "On the server", icon: Server },
  "health-sync": { label: "Health sync", icon: HeartPulse },
} as const;

/** Phone / browser in a few words, from the user agent. */
function device(ua: string | null) {
  if (!ua) return null;
  if (/Shortcuts|CFNetwork|Darwin/i.test(ua) && !/Mozilla/.test(ua)) return "iPhone Shortcut";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : null;
  if (!os) return null;
  const ver = ua.match(/OS (\d+)_/)?.[1] ?? ua.match(/Android (\d+)/)?.[1];
  return ver ? `${os} ${ver}` : os;
}

export function ProblemsAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"open" | "fixed">("open");
  const { data } = useQuery({
    queryKey: ["admin-errors", tab],
    queryFn: () => api<{ emailOn: boolean; errors: Problem[] }>(tab === "fixed" ? "?status=fixed" : ""),
    refetchInterval: 60_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-errors"] });
  const act = async (fn: () => Promise<unknown>, done?: string) => {
    try {
      await fn();
      if (done) toast({ title: done });
      await refresh();
    } catch (err) {
      toast({ title: "Didn't work", description: (err as Error).message, variant: "destructive" });
    }
  };
  const errors = data?.errors ?? [];
  const open = tab === "open";

  return (
    <Card id="problems" data-testid="problems-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bug className="h-5 w-5" /> Problems
          {open && errors.length > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">{errors.length}</span>}
        </CardTitle>
        <CardDescription>
          Crashes in the app, server errors and refused health syncs, grouped. Same problem again = the count goes up.
          {data && (data.emailOn ? " A summary is emailed to admins each morning on days with problems." : " Email isn't set up on the server, so there's no daily email: check here.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {(["open", "fixed"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", tab === t ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
            >
              {t === "open" ? "Open" : "Marked fixed"}
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            {open && errors.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => void act(() => api("/fix-all", { method: "POST" }), "All marked fixed")}>
                Mark all fixed
              </Button>
            )}
            {open && data?.emailOn && (
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => void act(async () => {
                const r = await api<{ sent: boolean; count: number }>("/email", { method: "POST" });
                toast({ title: r.sent ? `Email sent (${r.count})` : "Nothing new to email" });
              })}>
                <Mail className="h-3.5 w-3.5" /> Email now
              </Button>
            )}
          </div>
        </div>

        {errors.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-primary">
            <CheckCircle2 className="h-4 w-4" /> {open ? "No open problems." : "Nothing marked fixed yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e) => {
              const S = SOURCE[e.source] ?? SOURCE.server;
              return (
                <li key={e.id} className="rounded-xl border p-3" data-testid="problem-row">
                  <div className="flex items-start gap-2">
                    <S.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">{e.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {S.label}
                        {e.page ? ` · ${e.page}` : ""} · {e.count}× {e.people ? `· ${e.people} ${e.people === 1 ? "person" : "people"}` : ""}
                        {device(e.userAgent) ? ` · ${device(e.userAgent)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last {formatDistanceToNow(parseISO(e.lastSeen), { addSuffix: true })} · first {formatDistanceToNow(parseISO(e.firstSeen), { addSuffix: true })}
                      </p>
                      {e.detail && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-semibold text-primary">Details for the developer</summary>
                          <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-2 text-[11px] leading-snug">{e.detail}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-1">
                    {open ? (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => void act(() => api(`/${e.id}`, { method: "PUT", body: JSON.stringify({ fixed: true }) }))}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Mark fixed
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => void act(() => api(`/${e.id}`, { method: "PUT", body: JSON.stringify({ fixed: false }) }))}>
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => void act(() => api(`/${e.id}`, { method: "DELETE" }))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
