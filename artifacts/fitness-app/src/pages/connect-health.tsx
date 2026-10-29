import { useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, KeyRound, ListOrdered, Loader2, Smartphone, TriangleAlert, Unplug, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const disconnect = async () => {
    if (!window.confirm("Disconnect Apple Health? Your Shortcut will stop syncing. Data already synced stays.")) return;
    await revokeKey.mutateAsync();
    setKey(null);
    toast({ title: "Disconnected" });
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Connect your devices"
        description="Your phone, watch or ring saves to the iPhone Health app. A small Shortcut then sends each day's steps and active calories here every night."
      />

      {/* 1. Device */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Watch className="h-4 w-4 text-primary" /> 1. What do you track with?
          </CardTitle>
          <CardDescription>Pick your main device. The steps below change to match.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Your device">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={deviceId === d.id}
                onClick={() => pick(d.id)}
                className={cn(
                  "min-h-[64px] rounded-xl border p-3 text-left transition-colors",
                  deviceId === d.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
                )}
                data-testid={`device-${d.id}`}
              >
                <span className="block text-sm font-semibold">{d.name}</span>
                <span className="block text-xs text-muted-foreground">{d.examples}</span>
              </button>
            ))}
          </div>

          {device && (
            <div className="space-y-4 rounded-xl bg-muted/40 p-4" data-testid="device-guide">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  ["Steps", device.gives.steps],
                  ["Active calories", device.gives.energy],
                ].map(([label, v]) => (
                  <span
                    key={label as string}
                    className={cn("rounded-full px-2.5 py-1 font-semibold", v ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground line-through")}
                  >
                    {label as string}
                    {v === "estimate" ? " (estimate)" : ""}
                  </span>
                ))}
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">
                  {device.app ? `Turn on Apple Health in ${device.app}` : "Get it ready"}
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {device.setup.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </div>
              {device.tip && <p className="text-sm">{device.tip}</p>}
              {device.app && (
                <div className="border-t pt-3 text-sm">
                  <p className="font-semibold">Check it worked</p>
                  <p className="text-muted-foreground">
                    Open the iPhone <Q>Health</Q> app → tap your photo (top right) → <Q>Apps</Q> → <Q>{device.app}</Q>{" "}
                    → <Q>Turn On All</Q>. Then check <Q>Browse → Activity → Steps</Q> shows today's steps.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 rounded-xl border p-4 text-sm">
            <ListOrdered className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-semibold">Phone and watch both counting steps?</p>
              <p className="text-muted-foreground">
                That's fine: Apple Health counts each step once, using whichever device is higher in its list. To choose
                which one wins, open Health → <Q>Browse</Q> → <Q>Activity</Q> → <Q>Steps</Q> → <Q>Data Sources &amp; Access</Q> →{" "}
                <Q>Edit</Q>, and drag your watch or ring to the top.
              </p>
            </div>
          </div>

          <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground" data-testid="android-note">
            <Q>Android phone?</Q> Not yet, sorry. A web app can't read Google's Health Connect. For now, type your steps
            into the daily checklist on Today.
          </p>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            <div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Checking…</p>
              ) : status?.connected ? (
                <>
                  <p className="font-bold">
                    Connected <Badge className="ml-1 bg-primary hover:bg-primary">On</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-last-sync">
                    {status.lastSyncAt
                      ? `Last sync ${formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}`
                      : "Waiting for the first sync from your iPhone"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold">Not connected</p>
                  <p className="text-sm text-muted-foreground">Start with step 1 below.</p>
                </>
              )}
            </div>
          </div>
          {status?.connected && (
            <Button variant="ghost" className="gap-2 text-destructive" onClick={disconnect} disabled={revokeKey.isPending}>
              <Unplug className="h-4 w-4" /> Disconnect
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Key */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> 2. Your sync details
          </CardTitle>
          <CardDescription>
            Do this part on your iPhone if you can, so you can copy and paste straight into the Shortcuts app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="Web address (URL)" value={syncUrl()} testId="text-sync-url" />
          {key ? (
            <>
              <CopyField label="Authorization value (includes your key)" value={`Bearer ${key}`} testId="text-sync-key" />
              <div className="flex gap-2 rounded-lg border border-dusk/30 bg-dusk/10 p-3 text-sm">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-dusk" />
                <p>
                  Copy it into your Shortcut now: it's only shown once. Keep it private; anyone with it can add
                  health data to your account (but can't read anything).
                </p>
              </div>
            </>
          ) : (
            <Button onClick={makeKey} disabled={createKey.isPending} className="gap-2" data-testid="button-create-key">
              {createKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {status?.connected ? "Make a new key" : "Create my sync key"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Set up the Shortcut on your iPhone (about 10 minutes, once)</CardTitle>
          <CardDescription>
            Open the <Q>Shortcuts</Q> app, tap <Q>+</Q> and name the new shortcut <Q>Sync Fitness</Q>. Add every action
            below to this one shortcut, in order, using <Q>Search Actions</Q> at the bottom. Shortcuts saves as you go;
            to come back later, tap <Q>⋯</Q> on the Sync Fitness tile (tapping the middle runs it instead).
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
                  value: paste the <Q>Authorization value</Q> from above (starts with "Bearer").
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

      {status?.lastPayload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Last data received (for troubleshooting)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 p-3 text-xs" data-testid="text-last-payload">
              {status.lastPayload}
            </pre>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Set up before? If your Shortcut still has a Sleep step, it keeps working: the app now ignores sleep, so you
        can delete that step whenever you like. Synced steps fill in your daily checklist automatically. Workouts aren't synced yet, so keep logging them in Train.
      </p>
    </div>
  );
}
