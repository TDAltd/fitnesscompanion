import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { Bell, Copy, Eye, Loader2, Mail, Megaphone, MessageSquare, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { withBase } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type Audience = { segment: string; goal?: string | null; userIds?: number[] };
type Stats = Record<string, number>;
type Campaign = {
  id: number;
  name: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  audience: Audience;
  subject: string | null;
  body: string;
  pushTitle: string | null;
  pushBody: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  scheduledAt: string | null;
  startedAt: string | null;
  sentAt: string | null;
  inAppUntil: string | null;
  createdAt: string;
  stats: Stats | null;
};
type ListData = { campaigns: Campaign[]; segments: { id: string; label: string }[]; goals: string[]; emailOn: boolean; emailsPerHour: number };
type Draft = Omit<Campaign, "id" | "status" | "scheduledAt" | "startedAt" | "sentAt" | "inAppUntil" | "createdAt" | "stats"> & { id?: number };

const EMPTY: Draft = {
  name: "",
  email: true,
  push: true,
  inApp: true,
  audience: { segment: "all" },
  subject: "",
  body: "",
  pushTitle: "",
  pushBody: "",
  buttonLabel: "",
  buttonUrl: "/today",
};

const PAGES = [
  ["/today", "Today"],
  ["/eat", "Eat"],
  ["/train", "Train"],
  ["/progress", "Progress"],
  ["/plan", "My plan"],
  ["/reminders", "Reminders"],
  ["/connect-health", "Connect devices"],
  ["/me", "Me"],
] as const;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withBase(`/api/admin/marketing${path}`), {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Error ${res.status}`);
  return body as T;
}

const STATUS: Record<Campaign["status"], [string, string]> = {
  draft: ["Draft", "bg-muted text-foreground"],
  scheduled: ["Scheduled", "bg-dusk/20 text-foreground"],
  sending: ["Sending", "bg-amber-100 text-amber-900"],
  sent: ["Sent", "bg-primary/15 text-primary"],
  cancelled: ["Stopped", "bg-destructive/10 text-destructive"],
};

export function MarketingAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: ["admin-marketing"],
    queryFn: () => api<ListData>(""),
    refetchInterval: (q) => (q.state.data?.campaigns.some((c) => c.status === "sending") ? 15_000 : 60_000),
  });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-marketing"] });

  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast({ title: done });
      await refresh();
    } catch (err) {
      toast({ title: "Didn't work", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-semibold">Offers and news to your users</p>
            <p className="text-muted-foreground">
              By email, phone notification and a card on Today. People who switch offers off or unsubscribe never get them.
              {data && (data.emailOn ? ` Emails go out at up to ${data.emailsPerHour} an hour, so big lists take a while.` : " Email isn't set up on the server yet, so only notifications and in-app messages can go out.")}
            </p>
          </div>
          <Button className="h-11 shrink-0 gap-2" onClick={() => setEditing({ ...EMPTY })} data-testid="button-new-campaign">
            <Plus className="h-4 w-4" /> New message
          </Button>
        </CardContent>
      </Card>

      {data && data.campaigns.length === 0 && (
        <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">No messages yet. Start with a short offer and send a test to yourself first.</p>
      )}

      <ul className="space-y-3">
        {data?.campaigns.map((c) => (
          <li key={c.id}>
            <Card data-testid="campaign-row">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.status === "scheduled" && c.scheduledAt
                        ? `Goes out ${format(parseISO(c.scheduledAt), "EEE d MMM, h:mm a")}`
                        : c.sentAt
                          ? `Sent ${formatDistanceToNow(parseISO(c.sentAt), { addSuffix: true })}`
                          : c.startedAt
                            ? `Started ${formatDistanceToNow(parseISO(c.startedAt), { addSuffix: true })}`
                            : `Created ${formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}`}
                      {" · "}
                      {c.audience.segment === "users" ? `${c.audience.userIds?.length ?? 0} people chosen` : (data.segments.find((s) => s.id === c.audience.segment)?.label ?? "Everyone")}
                      {c.audience.goal ? `: ${c.audience.goal}` : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS[c.status][1])}>{STATUS[c.status][0]}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {c.email && <Chip icon={Mail}>Email</Chip>}
                  {c.push && <Chip icon={Bell}>Notification</Chip>}
                  {c.inApp && <Chip icon={MessageSquare}>In-app</Chip>}
                </div>
                {c.stats && <Results c={c} s={c.stats} />}
                <div className="flex flex-wrap justify-end gap-1">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewing(c.id)} data-testid="button-view-campaign">
                    <Eye className="h-3.5 w-3.5" /> {["draft", "scheduled"].includes(c.status) ? "Preview" : "View"}
                  </Button>
                  {["draft", "scheduled"].includes(c.status) && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing(c)}>
                      <Pencil className="h-3.5 w-3.5" /> {c.status === "scheduled" ? "Edit or send now" : "Edit and send"}
                    </Button>
                  )}
                  {c.status === "scheduled" && (
                    <Button size="sm" variant="ghost" onClick={() => void act(() => api(`/${c.id}/cancel`, { method: "POST" }), "Back to draft")}>
                      Unschedule
                    </Button>
                  )}
                  {c.status === "sending" && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void act(() => api(`/${c.id}/cancel`, { method: "POST" }), "Stopped")}>
                      Stop sending
                    </Button>
                  )}
                  {c.status === "sent" && c.inApp && c.inAppUntil && parseISO(c.inAppUntil).getTime() > Date.now() && (
                    <Button size="sm" variant="ghost" onClick={() => void act(() => api(`/${c.id}/cancel`, { method: "POST" }), "In-app card removed")}>
                      Remove in-app card
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => void act(() => api(`/${c.id}/duplicate`, { method: "POST" }), "Copied as a draft")}>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  {c.status !== "sending" && (
                    <Button size="sm" variant="ghost" aria-label="Delete" onClick={() => window.confirm("Delete this message and its results?") && void act(() => api(`/${c.id}`, { method: "DELETE" }), "Deleted")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {viewing && data && <CampaignView id={viewing} segments={data.segments} onClose={() => setViewing(null)} />}
      {editing && data && <Editor draft={editing} list={data} onClose={() => setEditing(null)} onDone={refresh} />}
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 font-semibold">
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function Results({ c, s }: { c: Campaign; s: Stats }) {
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");
  const cells: [string, string, string?][] = [["People", String(s.people)]];
  if (c.email) {
    cells.push(["Emails sent", String(s.email_sent), s.email_waiting ? `${s.email_waiting} waiting` : s.email_failed ? `${s.email_failed} failed` : undefined]);
    cells.push(["Opened", String(s.opened), pct(s.opened, s.email_sent)]);
  }
  if (c.push) cells.push(["Notifications", String(s.push_sent), s.push_no_device ? `${s.push_no_device} without` : undefined]);
  if (c.inApp) cells.push(["Saw in-app", String(s.seen), pct(s.seen, s.people)]);
  cells.push(["Tapped", String(s.clicked), pct(s.clicked, s.people)]);
  cells.push(["Unsubscribed", String(s.unsubscribed)]);
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7" data-testid="campaign-results">
      {cells.map(([k, v, sub]) => (
        <div key={k} className="rounded-xl bg-muted/50 px-2.5 py-2">
          <p className="font-display text-lg font-semibold tabular-nums leading-tight">{v}</p>
          <p className="text-[11px] text-muted-foreground">{k}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      ))}
    </div>
  );
}

function Editor({ draft, list, onClose, onDone }: { draft: Draft; list: ListData; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState<string | null>(null);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState(() => format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:00"));
  const [counts, setCounts] = useState<{ people: number; withPush: number; optedOut: number } | null>(null);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const custom = !!d.buttonUrl && !PAGES.some(([u]) => u === d.buttonUrl);
  const [customLink, setCustomLink] = useState(custom);

  useEffect(() => {
    let live = true;
    void api<{ people: number; withPush: number; optedOut: number }>("/audience", { method: "POST", body: JSON.stringify({ audience: d.audience }) })
      .then((r) => live && setCounts(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [d.audience]);

  const save = async () => {
    const fallback = d.subject?.trim().replace(/\{\{\s*name\s*\}\}/gi, "(name)");
    const body = JSON.stringify({ ...d, name: d.name.trim() || fallback || "Untitled message" });
    return d.id ? api<Campaign>(`/${d.id}`, { method: "PUT", body }) : api<Campaign>("", { method: "POST", body });
  };

  const run = async (kind: "draft" | "test" | "send") => {
    setBusy(kind);
    try {
      if (kind === "test") {
        const r = await api<{ sentTo: string }>("/test", { method: "POST", body: JSON.stringify(d) });
        toast({ title: "Test email sent", description: `Check ${r.sentTo}.` });
        return;
      }
      const saved = await save();
      set({ id: saved.id });
      if (kind === "draft") {
        toast({ title: "Saved as a draft" });
      } else {
        const atIso = when === "later" ? new Date(at).toISOString() : undefined;
        if (when === "later" && new Date(at).getTime() < Date.now() + 2 * 60 * 1000) throw new Error("Pick a time at least a few minutes from now.");
        const r = await api<{ status: string; people?: number }>(`/${saved.id}/send`, { method: "POST", body: JSON.stringify({ at: atIso }) });
        toast({
          title: r.status === "scheduled" ? "Scheduled" : "Sending",
          description: r.status === "scheduled" ? `Goes out ${format(new Date(at), "EEE d MMM, h:mm a")}.` : `To ${r.people ?? 0} people.`,
        });
        onClose();
      }
      onDone();
    } catch (err) {
      toast({ title: "Didn't work", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const reach = counts
    ? [
        `${counts.people} ${counts.people === 1 ? "person" : "people"}`,
        d.push ? `${counts.withPush} with notifications on` : null,
        counts.optedOut ? `${counts.optedOut} switched offers off (never included)` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Counting…";
  const confirmText = when === "later" ? "Schedule" : `Send to ${counts?.people ?? "…"} now`;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> {d.id ? "Edit message" : "New message"}
          </DialogTitle>
          <DialogDescription>Write it once; it goes out on each channel you tick. Type {"{{name}}"} for each person's first name.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <Field label="Name (only you see this)">
            <Input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. November discount" className="h-11" />
          </Field>

          <Field label="Send by">
            <div className="flex flex-wrap gap-2">
              {([["email", "Email", Mail], ["push", "Phone notification", Bell], ["inApp", "Card on Today", MessageSquare]] as const).map(([k, l, Icon]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={d[k]}
                  onClick={() => set({ [k]: !d[k] } as Partial<Draft>)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-2 font-semibold", d[k] ? "border-primary bg-primary text-primary-foreground" : "bg-card")}
                  data-testid={`channel-${k}`}
                >
                  <Icon className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
            {d.email && !list.emailOn && <p className="mt-1 text-xs text-destructive">Email isn't set up on the server, so the email part won't go out.</p>}
          </Field>

          <Field label="Who gets it">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={d.audience.segment}
                onChange={(e) => set({ audience: { segment: e.target.value, goal: e.target.value === "goal" ? (list.goals[0] ?? null) : null, userIds: e.target.value === "users" ? (d.audience.userIds ?? []) : undefined } })}
                className="h-11 flex-1 rounded-xl border bg-card px-3"
                data-testid="select-segment"
              >
                {list.segments.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {d.audience.segment === "goal" && (
                <select value={d.audience.goal ?? ""} onChange={(e) => set({ audience: { segment: "goal", goal: e.target.value } })} className="h-11 flex-1 rounded-xl border bg-card px-3">
                  {list.goals.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </div>
            {d.audience.segment === "users" && <PeoplePicker selected={d.audience.userIds ?? []} onChange={(ids) => set({ audience: { segment: "users", userIds: ids } })} />}
            <p className="mt-1 text-xs text-muted-foreground" data-testid="audience-count">{reach}</p>
          </Field>

          <Field label={d.email ? "Subject (also the title on Today)" : "Title"}>
            <Input value={d.subject ?? ""} onChange={(e) => set({ subject: e.target.value })} placeholder="e.g. 30% off your first coaching month" className="h-11" maxLength={150} data-testid="input-subject" />
          </Field>
          <Field label="Message">
            <Textarea
              value={d.body}
              onChange={(e) => set({ body: e.target.value })}
              rows={6}
              placeholder={"Hi {{name}},\n\nThis week only: ...\n\nLeave a blank line between paragraphs."}
              data-testid="input-body"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button text (optional)">
              <Input value={d.buttonLabel ?? ""} onChange={(e) => set({ buttonLabel: e.target.value })} placeholder="e.g. Claim my discount" className="h-11" maxLength={40} />
            </Field>
            <Field label="Button opens">
              {customLink ? (
                <div className="flex gap-2">
                  <Input value={d.buttonUrl ?? ""} onChange={(e) => set({ buttonUrl: e.target.value })} placeholder="https://…" className="h-11" />
                  <Button variant="ghost" className="h-11" onClick={() => { setCustomLink(false); set({ buttonUrl: "/today" }); }}>App page</Button>
                </div>
              ) : (
                <select
                  value={d.buttonUrl ?? "/today"}
                  onChange={(e) => (e.target.value === "custom" ? (setCustomLink(true), set({ buttonUrl: "https://" })) : set({ buttonUrl: e.target.value }))}
                  className="h-11 w-full rounded-xl border bg-card px-3"
                >
                  {PAGES.map(([u, l]) => (
                    <option key={u} value={u}>{l} (in the app)</option>
                  ))}
                  <option value="custom">A website link…</option>
                </select>
              )}
            </Field>
          </div>

          {d.push && (
            <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
              <Field label="Notification title">
                <Input value={d.pushTitle ?? ""} onChange={(e) => set({ pushTitle: e.target.value })} placeholder={d.subject || "Short and clear"} className="h-11" maxLength={60} />
              </Field>
              <Field label={`Notification text (${(d.pushBody ?? "").length}/160)`}>
                <Input value={d.pushBody ?? ""} onChange={(e) => set({ pushBody: e.target.value })} placeholder="One line people see on the lock screen" className="h-11" maxLength={160} />
              </Field>
            </div>
          )}

          <MessagePreview d={d} />

          <Field label="When">
            <div className="flex flex-wrap items-center gap-2">
              {(["now", "later"] as const).map((w) => (
                <button key={w} type="button" onClick={() => setWhen(w)} className={cn("rounded-full border px-3 py-2 font-semibold", when === w ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                  {w === "now" ? "Send now" : "Schedule"}
                </button>
              ))}
              {when === "later" && <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="h-11 w-auto" data-testid="input-schedule" />}
            </div>
            {when === "later" && <p className="mt-1 text-xs text-muted-foreground">Your phone's time ({Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>}
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" className="h-11" onClick={() => void run("draft")} disabled={!!busy}>
                {busy === "draft" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save draft
              </Button>
              {d.email && (
                <Button variant="outline" className="h-11 gap-1" onClick={() => void run("test")} disabled={!!busy} data-testid="button-test-email">
                  {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Test email to me
                </Button>
              )}
            </div>
            <Button
              className="h-11 gap-2"
              disabled={!!busy || (when === "now" && !counts?.people)}
              onClick={() => (when === "later" || window.confirm(`Send "${d.subject || d.name}" to ${counts?.people ?? 0} people now? This can't be undone.`)) && void run("send")}
              data-testid="button-send-campaign"
            >
              {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** What people see: the email, the notification and the card on Today. */
function MessagePreview({ d, name = "Ada" }: { d: Pick<Draft, "email" | "push" | "inApp" | "subject" | "body" | "pushTitle" | "pushBody" | "buttonLabel">; name?: string }) {
  const channels = (["email", "push", "inApp"] as const).filter((k) => d[k]);
  const [preview, setPreview] = useState<"email" | "push" | "inApp">(channels[0] ?? "email");
  const sample = (t: string) => t.replace(/\{\{\s*name\s*\}\}/gi, name);
  const paragraphs = useMemo(() => sample(d.body).split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean), [d.body, name]); // eslint-disable-line react-hooks/exhaustive-deps
  const show = channels.includes(preview) ? preview : channels[0];
  return (
    <div data-testid="message-preview">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {channels.map((k) => (
          <button key={k} type="button" onClick={() => setPreview(k)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", show === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {k === "email" ? "Email" : k === "push" ? "Notification" : "Today card"}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-muted/60 p-4">
        {show === "push" ? (
          <div className="mx-auto max-w-sm rounded-2xl bg-card p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fitness Companion · now</p>
            <p className="font-semibold">{sample(d.pushTitle || d.subject || "Title")}</p>
            <p className="text-muted-foreground">{sample(d.pushBody || "")}</p>
          </div>
        ) : show === "inApp" ? (
          <InAppPreview title={sample(d.subject || paragraphs[0] || "")} body={(d.subject ? paragraphs : paragraphs.slice(1)).join("\n\n")} button={d.buttonLabel} />
        ) : (
          <div className="mx-auto max-w-md rounded-2xl bg-card p-5 shadow-sm">
            <p className="mb-2 text-xs text-muted-foreground">Subject: {sample(d.subject || "")}</p>
            <p className="mb-2 font-display text-lg font-semibold">{paragraphs[0] ?? ""}</p>
            {paragraphs.slice(1).map((p, i) => (
              <p key={i} className="mb-2 leading-relaxed">{p}</p>
            ))}
            {d.buttonLabel && <span className="mt-2 inline-block rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground">{d.buttonLabel}</span>}
            <p className="mt-4 text-[11px] text-muted-foreground">Unsubscribe from offers and news</p>
          </div>
        )}
      </div>
    </div>
  );
}

type Person = { id: number; email: string; name: string | null; marketing: boolean; hasPush: boolean; lastActiveAt: string | null };

/** Tick specific people. Those who switched offers off are shown but can't be picked. */
function PeoplePicker({ selected, onChange }: { selected: number[]; onChange: (ids: number[]) => void }) {
  const { data: people } = useQuery({ queryKey: ["marketing-people"], queryFn: () => api<Person[]>("/people") });
  const [q, setQ] = useState("");
  const chosen = new Set(selected);
  const shown = (people ?? []).filter((p) => !q.trim() || `${p.name ?? ""} ${p.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pickable = shown.filter((p) => p.marketing);
  const toggle = (id: number) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="mt-2 rounded-xl border" data-testid="people-picker">
      <div className="flex items-center gap-2 border-b p-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="h-10" data-testid="input-people-search" />
        <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onChange([...new Set([...selected, ...pickable.map((p) => p.id)])])}>
          Tick all{q.trim() ? " shown" : ""}
        </Button>
        {selected.length > 0 && (
          <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onChange([])}>Clear</Button>
        )}
      </div>
      <ul className="max-h-64 divide-y overflow-y-auto">
        {!people && <li className="p-3 text-xs text-muted-foreground">Loading…</li>}
        {people && shown.length === 0 && <li className="p-3 text-xs text-muted-foreground">No one matches.</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <label className={cn("flex items-center gap-3 px-3 py-2", p.marketing ? "cursor-pointer hover:bg-muted/50" : "opacity-60")}>
              <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={chosen.has(p.id)} disabled={!p.marketing} onChange={() => toggle(p.id)} data-testid="person-checkbox" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name ?? p.email.split("@")[0]}</span>
                <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
              </span>
              {!p.marketing ? (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">Offers off</span>
              ) : p.hasPush ? (
                <Bell className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Has notifications on" />
              ) : null}
            </label>
          </li>
        ))}
      </ul>
      <p className="border-t px-3 py-2 text-xs font-semibold">{selected.length} chosen</p>
    </div>
  );
}

type RecipientRow = {
  userId: number;
  name: string | null;
  email: string;
  planned?: boolean;
  emailStatus?: string;
  emailSentAt?: string | null;
  pushStatus?: string;
  openedAt?: string | null;
  clickedAt?: string | null;
  seenAt?: string | null;
  dismissedAt?: string | null;
  unsubscribedAt?: string | null;
};

/** A sent (or planned) message: exactly what it said, and who it went to. */
function CampaignView({ id, segments, onClose }: { id: number; segments: ListData["segments"]; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["admin-marketing", id],
    queryFn: () => api<{ campaign: Campaign; recipients: RecipientRow[] }>(`/${id}`),
    refetchInterval: (q) => (q.state.data?.campaign.status === "sending" ? 15_000 : false),
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const c = data?.campaign;
  const planned = c && ["draft", "scheduled"].includes(c.status);
  const FILTERS: [string, (r: RecipientRow) => boolean][] = [
    ["All", () => true],
    ["Opened", (r) => !!r.openedAt],
    ["Not opened", (r) => r.emailStatus === "sent" && !r.openedAt],
    ["Tapped", (r) => !!r.clickedAt],
    ["Saw in app", (r) => !!r.seenAt],
    ["Unsubscribed", (r) => !!r.unsubscribedAt],
    ["Failed", (r) => r.emailStatus === "failed" || r.pushStatus === "failed"],
  ];
  const test = FILTERS.find(([k]) => k === filter)?.[1] ?? (() => true);
  const rows = (data?.recipients ?? [])
    .filter((r) => planned || test(r))
    .filter((r) => !q.trim() || `${r.name ?? ""} ${r.email}`.toLowerCase().includes(q.trim().toLowerCase()));
  const when = (iso?: string | null) => (iso ? format(parseISO(iso), "d MMM, h:mm a") : "");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{c?.name ?? "Message"}</DialogTitle>
          <DialogDescription>
            {c &&
              [
                c.sentAt
                  ? `Sent ${format(parseISO(c.sentAt), "EEE d MMM, h:mm a")}`
                  : c.status === "scheduled" && c.scheduledAt
                    ? `Scheduled for ${format(parseISO(c.scheduledAt), "EEE d MMM, h:mm a")}`
                    : STATUS[c.status][0],
                c.audience.segment === "users" ? `${c.audience.userIds?.length ?? 0} people chosen` : segments.find((s) => s.id === c.audience.segment)?.label,
                c.audience.goal,
              ]
                .filter(Boolean)
                .join(" · ")}
          </DialogDescription>
        </DialogHeader>
        {!c ? (
          <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-5 text-sm">
            <MessagePreview d={c} name={data.recipients[0]?.name?.split(" ")[0] || "Ada"} />
            {c.buttonLabel && <p className="text-xs text-muted-foreground">Button "{c.buttonLabel}" opens {c.buttonUrl}</p>}
            {c.stats && <Results c={c} s={c.stats} />}

            <div>
              <p className="mb-2 font-semibold">{planned ? `Will go to ${data.recipients.length} people` : `Sent to ${data.recipients.length} people`}</p>
              {!planned && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {FILTERS.map(([k]) => (
                    <button key={k} type="button" onClick={() => setFilter(k)} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", filter === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                      {k}
                    </button>
                  ))}
                </div>
              )}
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="mb-2 h-10" />
              <ul className="max-h-80 divide-y overflow-y-auto rounded-xl border" data-testid="recipient-list">
                {rows.length === 0 && <li className="p-3 text-xs text-muted-foreground">No one here.</li>}
                {rows.map((r) => (
                  <li key={r.userId} className="px-3 py-2" data-testid="recipient-row">
                    <p className="truncate font-semibold">{r.name ?? r.email.split("@")[0]}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                    {!r.planned && (
                      <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                        {c.email && <Tag tone={r.emailStatus === "sent" ? "ok" : r.emailStatus === "failed" ? "bad" : "dim"}>{r.emailStatus === "sent" ? `Email sent ${when(r.emailSentAt)}` : r.emailStatus === "failed" ? "Email failed" : r.emailStatus === "skipped" ? "No email" : "Email waiting"}</Tag>}
                        {r.openedAt && <Tag tone="ok">Opened {when(r.openedAt)}</Tag>}
                        {c.push && <Tag tone={r.pushStatus === "sent" ? "ok" : r.pushStatus === "failed" ? "bad" : "dim"}>{r.pushStatus === "sent" ? "Notification sent" : r.pushStatus === "none" ? "No notifications on" : r.pushStatus === "failed" ? "Notification failed" : r.pushStatus === "skipped" ? "No notification" : "Notification waiting"}</Tag>}
                        {c.inApp && <Tag tone={r.seenAt ? "ok" : "dim"}>{r.seenAt ? `Saw it in the app ${when(r.seenAt)}` : "Hasn't opened the app yet"}</Tag>}
                        {r.dismissedAt && <Tag tone="dim">Closed the card</Tag>}
                        {r.clickedAt && <Tag tone="ok">Tapped {when(r.clickedAt)}</Tag>}
                        {r.unsubscribedAt && <Tag tone="bad">Unsubscribed</Tag>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Tag({ tone, children }: { tone: "ok" | "bad" | "dim"; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 font-semibold", tone === "ok" ? "bg-primary/12 text-primary" : tone === "bad" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Same look as the real card on Today. */
export function InAppPreview({ title, body, button, onButton, onClose }: { title: string; body: string; button?: string | null; onButton?: () => void; onClose?: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm" data-testid="in-app-message">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-2 top-2 rounded-full p-2 text-muted-foreground hover:bg-muted">
        <X className="h-4 w-4" />
      </button>
      <p className="pr-8 font-display text-base font-semibold">{title}</p>
      {body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{body}</p>}
      {button && (
        <Button size="sm" className="mt-3 rounded-full" onClick={onButton}>
          {button}
        </Button>
      )}
    </div>
  );
}
