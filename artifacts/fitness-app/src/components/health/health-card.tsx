import { Link } from "wouter";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { Activity, AlertCircle, Flame, Moon, Footprints, RefreshCw, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSleep, useHealthDays, useSyncStatus } from "@/lib/health";
import { usePlan } from "@/lib/plan";

const SLEEP_TARGET_MIN = 7 * 60;

/** Dashboard card: latest numbers synced from Apple Health, or a prompt to connect. */
export function HealthCard() {
  const { data: status, isLoading: loadingStatus } = useSyncStatus();
  const { data: days, isLoading: loadingDays } = useHealthDays(7);
  const { plan } = usePlan();

  if (loadingStatus || loadingDays) {
    return (
      <Card>
        <CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  if (!status?.connected && !(days && days.length)) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-primary" />
            <div>
              <p className="font-bold">Sync steps & sleep from your phone or watch</p>
              <p className="text-sm text-muted-foreground">Works with iPhone, Apple Watch, Oraimo, Xiaomi, Huawei, Amazfit and smart rings.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" data-testid="link-connect-health">
            <Link href="/connect-health">Connect</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latest = days?.[0];
  const lastSync = status?.lastSyncAt ? new Date(status.lastSyncAt) : null;
  const stale = !lastSync || Date.now() - lastSync.getTime() > 36 * 60 * 60 * 1000;
  // Opens the "Sync Fitness" Shortcut on the iPhone (only the phone can read Apple Health)
  const runShortcut = "shortcuts://run-shortcut?name=" + encodeURIComponent("Sync Fitness");
  const sleepMin = latest?.sleepMinutes ?? null;
  const stepsGoal = plan?.targets.steps ?? 8000;
  const tiles = [
    {
      icon: Moon,
      label: "Sleep",
      value: formatSleep(sleepMin),
      sub: sleepMin == null ? "no data" : sleepMin >= SLEEP_TARGET_MIN ? "7h+ target met" : `${formatSleep(SLEEP_TARGET_MIN - sleepMin)} short of 7h`,
      good: sleepMin != null && sleepMin >= SLEEP_TARGET_MIN,
    },
    {
      icon: Footprints,
      label: "Steps",
      value: latest?.steps != null ? latest.steps.toLocaleString() : "—",
      sub: `goal ${stepsGoal.toLocaleString()}`,
      good: latest?.steps != null && latest.steps >= stepsGoal,
    },
    {
      icon: Flame,
      label: "Active energy",
      value: latest?.activeEnergyKcal != null ? latest.activeEnergyKcal.toLocaleString() : "—",
      sub: "kcal (info only)",
      good: false,
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-primary" /> From Apple Health
        </CardTitle>
        <span className="text-xs text-muted-foreground" data-testid="text-health-date">
          {latest ? `Data for ${format(parseISO(latest.date), "EEE d MMM")}` : "waiting for first sync"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ${stale ? "bg-dusk/10" : "bg-muted/40"}`} data-testid="health-sync-status">
          <span className="flex items-center gap-1.5">
            {stale && <AlertCircle className="h-3.5 w-3.5 text-dusk" />}
            {lastSync ? `Last synced ${formatDistanceToNowStrict(lastSync)} ago` : "Not synced yet"}
            {stale && lastSync && ". The nightly automation may be off."}
          </span>
          <span className="flex gap-1">
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs">
              <a href={runShortcut} data-testid="link-sync-now"><RefreshCw className="h-3.5 w-3.5" /> Sync now</a>
            </Button>
            {stale && (
              <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                <Link href="/connect-health">Check setup</Link>
              </Button>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {tiles.map(({ icon: Icon, label, value, sub, good }) => (
            <div key={label} className="space-y-1" data-testid={`health-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {label}
              </p>
              <p className="text-2xl font-semibold">{value}</p>
              <p className={`text-xs ${good ? "text-primary" : "text-muted-foreground"}`}>{sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
