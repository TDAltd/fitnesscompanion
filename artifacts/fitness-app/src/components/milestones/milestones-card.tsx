import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Share2 } from "lucide-react";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GROUP_LABELS, TIER_COLORS, TIER_LABEL, shareMilestone, tierOf, useMilestones, type Milestone, type MilestoneGroup } from "@/lib/milestones";
import { Medal } from "@/components/milestones/medal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHONE = "fc-medals-shone";
const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1));

/** Progress page: what you've reached, and the next milestone in each area. */
export function MilestonesCard() {
  const { data, isLoading } = useMilestones();
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const first = profile?.name?.trim().split(/\s+/)[0];

  const [open, setOpen] = useState<Milestone | null>(null);
  // Badges reached in the last 2 weeks shine once (remembered on this phone)
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const checked = useRef(false);
  useEffect(() => {
    if (!data || checked.current) return;
    checked.current = true;
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem(SHONE) ?? "[]"));
      const cutoff = Date.now() - 14 * 864e5;
      const now = data.milestones.filter((m) => m.earned && m.earnedAt && Date.parse(m.earnedAt) > cutoff && !seen.has(m.key)).map((m) => m.key);
      if (now.length) localStorage.setItem(SHONE, JSON.stringify([...seen, ...now]));
      setFresh(new Set(now));
    } catch {
      /* private mode: no shine */
    }
  }, [data]);

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
            <p className="mb-3 text-xs font-semibold text-muted-foreground">Reached</p>
            <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 lg:grid-cols-6">
              {earned.map((m) => (
                <li key={m.key}>
                  <button
                    type="button"
                    onClick={() => setOpen(m)}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl p-1.5 text-center transition-colors hover:bg-muted/50"
                    aria-label={`${m.title}, ${TIER_LABEL[tierOf(m)]}`}
                    data-testid="milestone-earned"
                  >
                    <Medal m={m} size={68} shimmer={fresh.has(m.key)} />
                    <span className="line-clamp-2 text-xs font-semibold leading-tight">{m.title}</span>
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
      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-sm text-center" data-testid="medal-detail">
          {open && (
            <>
              <Medal m={open} size={128} className="mx-auto mt-2" />
              <DialogHeader className="space-y-1.5 text-center sm:text-center">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: TIER_COLORS[tierOf(open)][1] }}>
                  {TIER_LABEL[tierOf(open)]} · {GROUP_LABELS[open.group]}
                </p>
                <DialogTitle className="font-display text-2xl font-medium">{open.title}</DialogTitle>
                <DialogDescription className="text-base">{open.line}</DialogDescription>
                {open.earnedAt && <p className="text-xs text-muted-foreground">Reached {format(parseISO(open.earnedAt), "d MMMM yyyy")}</p>}
              </DialogHeader>
              <Button className="h-11 w-full gap-2" onClick={() => void shareMilestone(open, first)} data-testid="button-share-medal">
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
