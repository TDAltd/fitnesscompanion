import { useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, HeartPulse, KeyRound, Loader2, Smartphone, TriangleAlert, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { syncUrl, useCreateSyncKey, useRevokeSyncKey, useSyncStatus } from "@/lib/health";

function CopyField({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
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
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
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
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black uppercase tracking-tight">
          <HeartPulse className="h-7 w-7 text-primary" /> Apple Health sync
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Send your daily <Q>steps</Q>, <Q>sleep</Q>, <Q>heart rate</Q> and <Q>active calories</Q> from your iPhone
          (and any watch that saves to Apple Health, like Oraimo) to this app automatically every night.
        </p>
      </header>

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
                    Connected <Badge className="ml-1 bg-green-600 hover:bg-green-600">On</Badge>
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
            <KeyRound className="h-4 w-4 text-primary" /> Your sync details
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
              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
          <CardTitle className="text-base">Set up the Shortcut on your iPhone (about 10 minutes, once)</CardTitle>
          <CardDescription>
            Open the <Q>Shortcuts</Q> app (pre-installed on iPhone). Tap <Q>+</Q> to make a new shortcut and name it{" "}
            <Q>Sync Fitness</Q>. Then add these actions in order, using the search bar at the bottom to find each one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-5">
            <Step n={1} title="Today's steps">
              <p>
                Add <Q>Find Health Samples</Q>. Set it to: <Q>Type is Steps</Q>, then tap <Q>Add Filter</Q> →{" "}
                <Q>Start Date is Today</Q>.
              </p>
              <p>
                Add <Q>Calculate Statistics</Q> right after it and choose <Q>Sum</Q>. Long-press the result and{" "}
                <Q>Rename</Q> it to <Q>Steps</Q>.
              </p>
            </Step>
            <Step n={2} title="Last night's sleep">
              <p>
                Add <Q>Find Health Samples</Q>: <Q>Type is Sleep</Q> (may be called Sleep Analysis), filter{" "}
                <Q>Start Date is in the last 1 day</Q>. If you're offered a <Q>Value</Q> filter, add{" "}
                <Q>Value is not In Bed</Q> and <Q>Value is not Awake</Q>.
              </p>
              <p>
                Add <Q>Get Details of Health Samples</Q> → <Q>Duration</Q>. Then <Q>Calculate Statistics</Q> →{" "}
                <Q>Sum</Q>. Rename the result <Q>Sleep</Q>.
              </p>
            </Step>
            <Step n={3} title="Heart rate and active calories">
              <p>
                <Q>Find Health Samples</Q>: <Q>Type is Heart Rate</Q>, <Q>Start Date is Today</Q> →{" "}
                <Q>Calculate Statistics</Q> → <Q>Average</Q>. Rename it <Q>HeartRate</Q>.
              </p>
              <p>
                <Q>Find Health Samples</Q>: <Q>Type is Active Energy</Q>, <Q>Start Date is Today</Q> →{" "}
                <Q>Calculate Statistics</Q> → <Q>Sum</Q>. Rename it <Q>Energy</Q>.
              </p>
            </Step>
            <Step n={4} title="Today's date">
              <p>
                Add <Q>Format Date</Q>: date <Q>Current Date</Q>, Date Format <Q>Custom</Q>, format string{" "}
                <code className="rounded bg-muted px-1">yyyy-MM-dd</code>.
              </p>
            </Step>
            <Step n={5} title="Send it to the app">
              <p>
                Add <Q>Get Contents of URL</Q>. Paste the <Q>Web address</Q> from above. Tap the arrow to show more
                options:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <Q>Method:</Q> POST
                </li>
                <li>
                  <Q>Headers:</Q> add one. Key <code className="rounded bg-muted px-1">Authorization</code>, value: paste
                  the <Q>Authorization value</Q> from above (it starts with "Bearer").
                </li>
                <li>
                  <Q>Request Body:</Q> JSON. Add 5 fields (type <Q>Text</Q>), and for each value tap and pick the
                  variable:
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
                    <span>date</span><span>→ Formatted Date</span>
                    <span>steps</span><span>→ Steps</span>
                    <span>sleep</span><span>→ Sleep</span>
                    <span>heartRate</span><span>→ HeartRate</span>
                    <span>activeEnergy</span><span>→ Energy</span>
                  </div>
                </li>
              </ul>
              <p>
                Finally add <Q>Show Notification</Q> with <Q>Contents of URL</Q>, so you can see what was synced.
              </p>
            </Step>
            <Step n={6} title="Test it">
              <p>
                Tap <Q>▶</Q> to run the shortcut. Allow access to Health when asked (turn on all the types). You should
                see a notification like <em>"Synced: 8,432 steps, 7h 32m sleep…"</em> and this page will show a recent
                sync.
              </p>
            </Step>
            <Step n={7} title="Make it run every night">
              <p>
                In Shortcuts tap <Q>Automation</Q> → <Q>+</Q> → <Q>Time of Day</Q> → <Q>10:00 PM</Q>,{" "}
                <Q>Daily</Q> → choose <Q>Run Immediately</Q> → <Q>Next</Q> → pick <Q>Sync Fitness</Q>.
              </p>
              <p>
                Run it by hand any time too; it updates the same day rather than adding twice. Make sure the oraimo
                health app has synced your watch first, or the latest numbers won't be in Apple Health yet.
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
        Steps from Apple Health replace the steps in your daily checklist for that day. Workouts aren't synced: oraimo
        health doesn't share them with Apple Health, so keep logging them in the app.
      </p>
    </div>
  );
}
