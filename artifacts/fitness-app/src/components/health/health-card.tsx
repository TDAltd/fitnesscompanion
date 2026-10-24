import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { Activity, Flame, Moon, Footprints, Smartphone } from "lucide-react";
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
              <p className="font-bold">Sync steps & sleep from your iPhone</p>
              <p className="text-sm text-muted-foreground">Connect Apple Health so your watch data fills in automatically.</p>
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
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider">
          <Activity className="h-4 w-4 text-primary" /> From Apple Health
        </CardTitle>
        <span className="font-mono text-xs text-muted-foreground" data-testid="text-health-date">
          {latest ? format(parseISO(latest.date), "EEE d MMM") : "waiting for first sync"}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {tiles.map(({ icon: Icon, label, value, sub, good }) => (
            <div key={label} className="space-y-1" data-testid={`health-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {label}
              </p>
              <p className="text-2xl font-black">{value}</p>
              <p className={`font-mono text-xs ${good ? "text-green-600" : "text-muted-foreground"}`}>{sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
