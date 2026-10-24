import { useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { Check, Copy, HeartPulse, KeyRound, Loader2, Smartphone, TriangleAlert, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { syncUrl, useCreateSyncKey, useRevokeSyncKey, useSyncStatus } from "@/lib/health";

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
        title="Apple Health"
        description="Send your daily steps, sleep and active calories from your iPhone (and any watch that saves to Apple Health, like Oraimo) to this app every night."
      />

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
          <CardTitle className="text-base">Set up the Shortcut on your iPhone (about 10 minutes, once)</CardTitle>
          <CardDescription>
            Open the <Q>Shortcuts</Q> app, tap <Q>+</Q> and name the new shortcut <Q>Sync Fitness</Q>. Add every action
            below to this one shortcut, in order, using <Q>Search Actions</Q> at the bottom. Shortcuts saves as you go;
            to come back later, tap <Q>⋯</Q> on the Sync Fitness tile (tapping the middle runs it instead).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Every health item uses the same three actions: <Q>Find Health Samples</Q> → <Q>Calculate Statistics</Q> →{" "}
            <Q>Set Variable</Q>. On newer iPhones the result is called <Q>Sum</Q>; that's the one to pick. Add the
            filter <Q>Source is oraimo health</Q> each time, so steps your phone also counted aren't added twice.
          </div>
          <ol className="space-y-5">
            <Step n={1} title="Steps">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Steps</Q>, Start Date is <Q>today</Q>, Source is <Q>oraimo health</Q>. Leave Unit, Group by, Sort by and Limit as they are.</li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q></li>
                <li><Q>Set Variable</Q>: name <Q>Steps</Q>, to <Q>Sum</Q></li>
              </ul>
            </Step>
            <Step n={2} title="Sleep">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Sleep</Q>, Start Date is <Q>in the last 1 days</Q>, Source is <Q>oraimo health</Q>. If a <Q>Value</Q> filter is offered, add <Q>Value is not In Bed</Q>.</li>
                <li><Q>Get Details of Health Samples</Q>: <Q>Duration</Q></li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q> (it reads "Sum of Duration")</li>
                <li><Q>Set Variable</Q>: name <Q>Sleep</Q>, to the <Q>Sum</Q> directly above</li>
              </ul>
            </Step>
            <Step n={3} title="Active calories">
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Find Health Samples</Q>: Type is <Q>Active Energy</Q>, Start Date is <Q>today</Q>, Source is <Q>oraimo health</Q>. Set <Q>Unit</Q> to <Q>kcal</Q> (not "cal").</li>
                <li><Q>Calculate Statistics</Q>: <Q>Sum</Q></li>
                <li><Q>Set Variable</Q>: name <Q>Energy</Q>, to the <Q>Sum</Q> directly above</li>
              </ul>
            </Step>
            <Step n={4} title="Today's date">
              <p>
                <Q>Format Date</Q>: tap the date and choose <Q>Current Date</Q>. Tap the arrow for more options → Date
                Format <Q>Custom</Q> → type <code className="rounded bg-muted px-1">yyyy-MM-dd</code> (capital MM).
              </p>
            </Step>
            <Step n={5} title="Send it to the app">
              <p>Add <Q>Get Contents of URL</Q> and paste the <Q>Web address</Q> from above. Tap the arrow for more options:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><Q>Method:</Q> POST</li>
                <li>
                  <Q>Headers:</Q> tap <Q>Add new header</Q>. Key <code className="rounded bg-muted px-1">Authorization</code>,
                  value: paste the <Q>Authorization value</Q> from above (starts with "Bearer").
                </li>
                <li>
                  <Q>Request Body:</Q> <Q>JSON</Q>. Tap <Q>Add new field</Q> → <Q>Text</Q> four times. Type the key
                  exactly, then tap the value box and pick the variable:
                  <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <span>date</span><span>→ Formatted Date</span>
                    <span>steps</span><span>→ Steps</span>
                    <span>sleep</span><span>→ Sleep</span>
                    <span>activeEnergy</span><span>→ Energy</span>
                  </div>
                </li>
              </ul>
              <p>Last, add <Q>Show Notification</Q> and set it to <Q>Contents of URL</Q>, so you see what was synced.</p>
            </Step>
            <Step n={6} title="Test it">
              <p>
                Open the oraimo health app first so the watch syncs. Then tap <Q>▶</Q> in your shortcut and allow Health
                access when asked. You should see a notification like <em>"Synced 2026-10-24: 8,432 steps, 7h 32m sleep,
                412 kcal active"</em>, and this page will show the sync time.
              </p>
            </Step>
            <Step n={7} title="Run it every night">
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
        Steps from Apple Health replace the steps in your daily checklist for that day. Workouts aren't synced: oraimo
        health doesn't share them with Apple Health, so keep logging them in the app.
      </p>
    </div>
  );
}
