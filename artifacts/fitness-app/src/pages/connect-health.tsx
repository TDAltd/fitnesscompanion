import { useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, ChevronDown, CircleCheck, Copy, KeyRound, Loader2, Plus, RotateCw, Smartphone, TriangleAlert, Unplug, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { syncUrl, useCreateSyncKey, useRevokeSyncKey, useSyncStatus } from "@/lib/health";
import { DEVICES, deviceById, saveDevice, savedDevice, type DeviceId } from "@/lib/devices";
import { cn } from "@/lib/utils";

function CopyField({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded-md border bg-muted/50 px-3 py-2 text-xs" data-testid={testId}>
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked: user can select the text */
            }
          }}
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pb-2">
        <p className="font-bold leading-7">{title}</p>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

/** "date, steps, activeEnergy" from the last payload, for the status card. */
function lastSync(payload: string | null | undefined): { date?: string; steps?: number; energy?: number } | null {
  if (!payload) return null;
  try {
    const p = JSON.parse(payload) as Record<string, unknown>;
    const n = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? undefined : Math.round(Number(v)));
    return { date: typeof p.date === "string" ? p.date : undefined, steps: n(p.steps), energy: n(p.activeEnergy) };
  } catch {
    return null;
  }
}

/** A tidy folding section. */
function Fold({ title, children, testId, defaultOpen }: { title: ReactNode; children: ReactNode; testId?: string; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-2xl border bg-card" data-testid={testId} open={defaultOpen}>
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-5 py-4 text-sm">{children}</div>
    </details>
  );
}

const Q = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-foreground">{children}</strong>
);

export default function ConnectHealthPage() {
  const { data: status, isLoading } = useSyncStatus();
  const createKey = useCreateSyncKey();
  const revokeKey = useRevokeSyncKey();
  const { toast } = useToast();
  const [key, setKey] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<DeviceId | null>(savedDevice);
  const device = deviceById(deviceId);
  const pick = (id: DeviceId) => {
    setDeviceId(id);
    saveDevice(id);
  };

  const makeKey = async () => {
    if (status?.connected && !window.confirm("Make a new key? The old one stops working, so you'll need to update your Shortcut.")) return;
    try {
      const result = await createKey.mutateAsync();
      setKey(result.key);
    } catch (err) {
      toast({ title: "Couldn't create a key", description: String((err as Error).message), variant: "destructive" });
    }
  };

  // Once data has arrived, the setup steps fold away until you disconnect (or ask for them)
  const synced = Boolean(status?.connected && status.lastSyncAt);
  const [showSetup, setShowSetup] = useState(false);
  const setupOpen = !synced || showSetup;
  const quick = Boolean(status?.shortcutLink);
  const last = lastSync(status?.lastPayload);

  const disconnect = async () => {
    if (!window.confirm("Disconnect Apple Health? Your Shortcut will stop syncing. Data already synced stays.")) return;
    await revokeKey.mutateAsync();
    setKey(null);
    toast({ title: "Disconnected" });
  };

  return (
    <div className="space-y-5 pb-20">
      <PageHeader title="Connect your devices" description="Your daily steps and active calories from your phone, watch or ring, sent here every night." />

      {/* Status: the only thing you see once it's working */}
      <Card className={cn(synced && "border-primary/30 bg-primary/5")} data-testid="sync-status">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            {synced ? <CircleCheck className="mt-0.5 h-7 w-7 shrink-0 text-primary" /> : <Smartphone className="mt-0.5 h-7 w-7 shrink-0 text-primary" />}
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Checking…</p>
              ) : synced ? (
                <>
                  <p className="font-semibold">Connected{device ? ` · ${device.name}` : ""}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-last-sync">
                    Last sync {formatDistanceToNow(new Date(status!.lastSyncAt!), { addSuffix: true })}
                    {last?.steps != null ? ` · ${last.steps.toLocaleString()} steps` : ""}
                    {last?.energy != null ? `, ${last.energy.toLocaleString()} kcal active` : ""}
                  </p>
                </>
              ) : status?.connected ? (
                <>
                  <p className="font-semibold">Almost there</p>
                  <p className="text-sm text-muted-foreground">Waiting for the first sync. Finish step 3, then run the Shortcut once.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Not connected yet</p>
                  <p className="text-sm text-muted-foreground">Three steps{quick ? ", about 3 minutes" : ""}. Do them on your iPhone.</p>
                </>
              )}
            </div>
          </div>
          {status?.connected && (
            <div className="flex flex-wrap gap-2">
              {synced && (
                <Button variant="outline" className="h-10 gap-2" onClick={() => setShowSetup((v) => !v)} data-testid="button-toggle-setup-steps">
                  <RotateCw className="h-4 w-4" /> {showSetup ? "Hide setup steps" : "Change device or set up again"}
                </Button>
              )}
              <Button variant="ghost" className="h-10 gap-2 text-destructive" onClick={disconnect} disabled={revokeKey.isPending}>
                <Unplug className="h-4 w-4" /> Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {setupOpen && (
        <>
          {/* 1. Device */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><Watch className="h-4 w-4 text-primary" /> 1. What do you track with?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Your device">
                {DEVICES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={deviceId === d.id}
                    onClick={() => pick(d.id)}
                    className={cn(
                      "min-h-[48px] rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors",
                      deviceId === d.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:bg-muted/60",
                    )}
                    data-testid={`device-${d.id}`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>

              {device && (
                <div className="space-y-3 rounded-xl bg-muted/40 p-4 text-sm" data-testid="device-guide">
                  <p className="font-semibold">{device.app ? `In ${device.app}, turn on Apple Health` : "Nothing to install"}</p>
                  <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                    {device.setup.map((line) => <li key={line}>{line}</li>)}
                  </ol>
                  {device.tip && <p className="text-muted-foreground">{device.tip}</p>}
                  <p className="text-xs text-muted-foreground">
                    Sends steps{device.gives.energy ? ` and active calories${device.gives.energy === "estimate" ? " (estimated)" : ""}` : ""}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-primary" /> 2. Your sync key</CardTitle>
              <CardDescription>It links the Shortcut to your account. Shown once, so copy it before you leave this page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {key ? (
                <>
                  <CopyField label="Your key" value={`Bearer ${key}`} testId="text-sync-key" />
                  {!quick && <CopyField label="Web address (URL)" value={syncUrl()} testId="text-sync-url" />}
                  <p className="flex gap-2 text-xs text-muted-foreground">
                    <TriangleAlert className="h-4 w-4 shrink-0 text-dusk" />
                    Keep it private: anyone with it can add steps to your account (but can't read anything).
                  </p>
                </>
              ) : (
                <Button onClick={makeKey} disabled={createKey.isPending} className="h-11 gap-2" variant={status?.connected ? "outline" : "default"} data-testid="button-create-key">
                  {createKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status?.connected ? "Make a new key" : "Create my key"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 3. Shortcut */}
          {quick ? (
            <Card data-testid="quick-shortcut">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">3. Add the Shortcut</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  <Step n={1} title="Add it">
                    <Button asChild className="h-12 gap-2" data-testid="button-add-shortcut">
                      <a href={status!.shortcutLink!} target="_blank" rel="noopener noreferrer"><Plus className="h-4 w-4" /> Add the Sync Fitness Shortcut</a>
                    </Button>
                    <p>In the Shortcuts app, tap <Q>Set Up Shortcut</Q>, paste <Q>your key</Q> when asked, then <Q>Add Shortcut</Q>.</p>
                  </Step>
                  <Step n={2} title="Test it">
                    <p>
                      {device?.app ? <>Open <Q>{device.app}</Q> so your device syncs, then tap</> : <>Tap</>} the <Q>Sync Fitness</Q> tile and allow Health access.
                      This page will show "Connected".
                    </p>
                  </Step>
                  <Step n={3} title="Run it every night">
                    <p>
                      Shortcuts → <Q>Automation</Q> → <Q>+</Q> → <Q>Time of Day</Q> → <Q>10:00 PM</Q>, <Q>Daily</Q> → <Q>Run Immediately</Q> → choose <Q>Sync Fitness</Q>.
                    </p>
                  </Step>
                </ol>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">3. Build the Shortcut (about 10 minutes, once)</CardTitle>
                <CardDescription>
                  In <Q>Shortcuts</Q>, tap <Q>+</Q> and name it <Q>Sync Fitness</Q>. Add each action below in order using <Q>Search Actions</Q>.
                </CardDescription>
              </CardHeader>
              <CardContent>
          <div className="mb-5 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Every health item uses the same three actions: <Q>Find Health Samples</Q> → <Q>Calculate Statistics</Q> →{" "}
            <Q>Set Variable</Q>. On newer iPhones the result is called <Q>Sum</Q>; that's the one to pick. Don't add a
            Source filter: setting <Q>Group By</Q> to <Q>Day</Q> gives Health's own daily total, with each step counted once.
          </div>
          <ol className="space-y-5">
            <Step n={1} title="Steps">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Steps</Q>, Start Date is <Q>today</Q>. Set <Q>Group By</Q> to <Q>Day</Q>. Leave Unit, Sort by and Limit as they are.</li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q></li>
                <li><Q>Set Variable</Q>: name <Q>Steps</Q>, to <Q>Sum</Q></li>
              </ul>
            </Step>
            <Step n={2} title="Active calories">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Active Energy</Q>, Start Date is <Q>today</Q>, <Q>Group By</Q> <Q>Day</Q>. Set <Q>Unit</Q> to <Q>kcal</Q> (not "cal").</li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q></li>
                <li><Q>Set Variable</Q>: name <Q>Energy</Q>, to the <Q>Sum</Q> directly above</li>
              </ul>
            </Step>
            <Step n={3} title="Today's date">
              <p>
                <Q>Format Date</Q>: tap the date and choose <Q>Current Date</Q>. Tap the arrow for more options → Date
                Format <Q>Custom</Q> → type <code className="rounded bg-muted px-1">yyyy-MM-dd</code> (capital MM).
              </p>
            </Step>
            <Step n={4} title="Send it to the app">
              <p>Add <Q>Get Contents of URL</Q> and paste the <Q>Web address</Q> from above. Tap the arrow for more options:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Method:</Q> POST</li>
                <li>
                  <Q>Headers:</Q> tap <Q>Add new header</Q>. Key <code className="rounded bg-muted px-1">Authorization</code>,
                  value: paste <Q>your key</Q> from step 2 (starts with "Bearer").
                </li>
                <li>
                  <Q>Request Body:</Q> <Q>JSON</Q>. Tap <Q>Add new field</Q> → <Q>Text</Q> three times. Type the key
                  exactly, then tap the value box and pick the variable:
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <span>date</span><span>→ Formatted Date</span>
                    <span>steps</span><span>→ Steps</span>
                    <span>activeEnergy</span><span>→ Energy</span>
                  </div>
                </li>
              </ul>
              <p>Last, add <Q>Show Notification</Q> and set it to <Q>Contents of URL</Q>, so you see what was synced.</p>
            </Step>
            <Step n={5} title="Test it">
              <p>
                {device?.app ? <>Open <Q>{device.app}</Q> first so your device syncs. Then tap</> : <>Tap</>} <Q>▶</Q> in your shortcut and allow Health
                access when asked. You should see a notification like <em>"Synced 2026-10-24: 8,432 steps, 412 kcal
                active"</em>, and this page will show the sync time.
              </p>
              <p>
                If steps look about double what your device shows, open <Q>Find Health Samples</Q> for Steps and add{" "}
                <Q>Source is</Q> your watch or ring app.
              </p>
            </Step>
            <Step n={6} title="Run it every night">
              <p>
                In Shortcuts tap <Q>Automation</Q> → <Q>+</Q> → <Q>Time of Day</Q> → <Q>10:00 PM</Q>, <Q>Daily</Q> →{" "}
                <Q>Run Immediately</Q> → <Q>Next</Q> → choose <Q>Sync Fitness</Q>. You can still run it by hand any
                time; it updates the same day instead of adding it twice.
              </p>
            </Step>
          </ol>
              </CardContent>
            </Card>
          )}

          {quick && (
            <Fold title="Prefer to build the Shortcut yourself?" testId="manual-guide">
              <div className="space-y-4">
                <CopyField label="Web address (URL)" value={syncUrl()} testId="text-sync-url" />
          <div className="mb-5 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Every health item uses the same three actions: <Q>Find Health Samples</Q> → <Q>Calculate Statistics</Q> →{" "}
            <Q>Set Variable</Q>. On newer iPhones the result is called <Q>Sum</Q>; that's the one to pick. Don't add a
            Source filter: setting <Q>Group By</Q> to <Q>Day</Q> gives Health's own daily total, with each step counted once.
          </div>
          <ol className="space-y-5">
            <Step n={1} title="Steps">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Steps</Q>, Start Date is <Q>today</Q>. Set <Q>Group By</Q> to <Q>Day</Q>. Leave Unit, Sort by and Limit as they are.</li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q></li>
                <li><Q>Set Variable</Q>: name <Q>Steps</Q>, to <Q>Sum</Q></li>
              </ul>
            </Step>
            <Step n={2} title="Active calories">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Active Energy</Q>, Start Date is <Q>today</Q>, <Q>Group By</Q> <Q>Day</Q>. Set <Q>Unit</Q> to <Q>kcal</Q> (not "cal").</li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q></li>
                <li><Q>Set Variable</Q>: name <Q>Energy</Q>, to the <Q>Sum</Q> directly above</li>
              </ul>
            </Step>
            <Step n={3} title="Today's date">
              <p>
                <Q>Format Date</Q>: tap the date and choose <Q>Current Date</Q>. Tap the arrow for more options → Date
                Format <Q>Custom</Q> → type <code className="rounded bg-muted px-1">yyyy-MM-dd</code> (capital MM).
              </p>
            </Step>
            <Step n={4} title="Send it to the app">
              <p>Add <Q>Get Contents of URL</Q> and paste the <Q>Web address</Q> from above. Tap the arrow for more options:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Method:</Q> POST</li>
                <li>
                  <Q>Headers:</Q> tap <Q>Add new header</Q>. Key <code className="rounded bg-muted px-1">Authorization</code>,
                  value: paste <Q>your key</Q> from step 2 (starts with "Bearer").
                </li>
                <li>
                  <Q>Request Body:</Q> <Q>JSON</Q>. Tap <Q>Add new field</Q> → <Q>Text</Q> three times. Type the key
                  exactly, then tap the value box and pick the variable:
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <span>date</span><span>→ Formatted Date</span>
                    <span>steps</span><span>→ Steps</span>
                    <span>activeEnergy</span><span>→ Energy</span>
                  </div>
                </li>
              </ul>
              <p>Last, add <Q>Show Notification</Q> and set it to <Q>Contents of URL</Q>, so you see what was synced.</p>
            </Step>
            <Step n={5} title="Test it">
              <p>
                {device?.app ? <>Open <Q>{device.app}</Q> first so your device syncs. Then tap</> : <>Tap</>} <Q>▶</Q> in your shortcut and allow Health
                access when asked. You should see a notification like <em>"Synced 2026-10-24: 8,432 steps, 412 kcal
                active"</em>, and this page will show the sync time.
              </p>
              <p>
                If steps look about double what your device shows, open <Q>Find Health Samples</Q> for Steps and add{" "}
                <Q>Source is</Q> your watch or ring app.
              </p>
            </Step>
            <Step n={6} title="Run it every night">
              <p>
                In Shortcuts tap <Q>Automation</Q> → <Q>+</Q> → <Q>Time of Day</Q> → <Q>10:00 PM</Q>, <Q>Daily</Q> →{" "}
                <Q>Run Immediately</Q> → <Q>Next</Q> → choose <Q>Sync Fitness</Q>. You can still run it by hand any
                time; it updates the same day instead of adding it twice.
              </p>
            </Step>
          </ol>
              </div>
            </Fold>
          )}
        </>
      )}

      <Fold title="Good to know">
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            <Q>Phone and watch both counting?</Q> Apple Health counts each step once. To pick which device wins: Health → <Q>Browse</Q> →{" "}
            <Q>Activity</Q> → <Q>Steps</Q> → <Q>Data Sources &amp; Access</Q> → <Q>Edit</Q>, and drag your watch or ring to the top.
          </li>
          <li>Synced steps fill in your daily checklist on Today. Workouts aren't synced, so keep logging them in Train.</li>
          <li data-testid="android-note"><Q>Android phone?</Q> Not yet: a web app can't read Health Connect. Type your steps on Today for now.</li>
          <li>An older Shortcut with a Sleep step still works; the app ignores sleep, so you can delete that step.</li>
        </ul>
      </Fold>

    </div>
  );
}
