import { format, parseISO } from "date-fns";
import { Share2 } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GROUP_LABELS, shareMilestone, useMilestones, type MilestoneGroup } from "@/lib/milestones";

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

/** Progress page: what you've reached, and the next milestone in each area. */
export function MilestonesCard() {
  const { data, isLoading } = useMilestones();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const first = profile?.name?.trim().split(/\s+/)[0];

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="p-5"><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }
  const earned = data.milestones.filter((m) => m.earned).sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
  const groups = Object.keys(GROUP_LABELS) as MilestoneGroup[];
  // Next one per area: the unearned milestone you're closest to
  const next = groups
    .map((g) =>
      data.milestones
        .filter((m) => m.group === g && !m.earned)
        .sort((a, b) => b.progress.current / b.progress.target - a.progress.current / a.progress.target || a.progress.target - b.progress.target)[0],
    )
    .filter(Boolean);

  return (
    <Card data-testid="milestones-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Milestones</CardTitle>
        <CardDescription>{earned.length ? `${earned.length} reached so far.` : "Your first ones are close. Log a meal or a workout to start."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {next.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Up next</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {next.map((m) => (
                <li key={m.key} className="rounded-xl border p-3" data-testid="milestone-next">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden>{m.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{GROUP_LABELS[m.group]}</p>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {fmt(m.progress.current)}/{fmt(m.progress.target)} {m.unit}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((m.progress.current / m.progress.target) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {earned.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Reached</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {earned.map((m) => (
                <li key={m.key}>
                  <button
                    type="button"
                    onClick={() => void shareMilestone(m, first)}
                    className="flex h-full w-full items-start gap-2 rounded-xl bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
                    aria-label={`Share ${m.title}`}
                    data-testid="milestone-earned"
                  >
                    <span className="text-xl" aria-hidden>{m.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight">{m.title}</span>
                      {m.earnedAt && <span className="block text-xs text-muted-foreground">{format(parseISO(m.earnedAt), "d MMM yyyy")}</span>}
                    </span>
                    <Share2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Days only count when you eat at least the safe minimum. Totals never reset, so a missed day is just a missed day.
        </p>
      </CardContent>
    </Card>
  );
}
