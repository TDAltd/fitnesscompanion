import { Link } from "wouter";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { CalendarCheck, TrendingDown } from "lucide-react";
import { useListWeightLogs, getListWeightLogsQueryKey, useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeightLogDialog } from "@/components/forms/weight-log-dialog";

/**
 * Shows on Sundays, or when the last weigh-in was a week or more ago.
 * If weight has stayed flat for 3+ weeks while trying to lose, suggests reviewing the plan.
 */
export function WeeklyCheckIn() {
  const { data: logs } = useListWeightLogs({ query: { queryKey: getListWeightLogsQueryKey() } });
  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  if (!logs) return null;

  const sorted = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const last = sorted.at(-1);
  const today = new Date();
  const daysSince = last ? differenceInCalendarDays(today, parseISO(last.loggedAt)) : Infinity;
  const due = daysSince >= 7 || (today.getDay() === 0 && daysSince > 0);

  // Plateau: losing weight is the goal, and the last 3+ weeks of weigh-ins moved less than 0.3 kg
  const losing = profile?.fitnessGoal === "Weight loss" || (profile?.goalWeightKg != null && profile?.currentWeightKg != null && profile.goalWeightKg < profile.currentWeightKg);
  let plateau = false;
  if (losing && last && sorted.length >= 3) {
    const windowStart = sorted.filter((l) => differenceInCalendarDays(parseISO(last.loggedAt), parseISO(l.loggedAt)) >= 21).at(-1);
    if (windowStart) {
      const inWindow = sorted.filter((l) => l.loggedAt >= windowStart.loggedAt);
      const min = Math.min(...inWindow.map((l) => l.weightKg));
      const max = Math.max(...inWindow.map((l) => l.weightKg));
      plateau = inWindow.length >= 3 && max - min < 0.3;
    }
  }

  if (!due && !plateau) return null;

  return (
    <Card className="border-dusk/30 bg-dusk/5" data-testid="weekly-check-in">
      <CardContent className="space-y-3 p-5">
        {due && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <CalendarCheck className="h-5 w-5 shrink-0 text-dusk" />
              <div>
                <p className="font-semibold">Weekly check-in</p>
                <p className="text-sm text-muted-foreground">
                  {last ? `Last weigh-in ${daysSince} day${daysSince === 1 ? "" : "s"} ago.` : "No weigh-ins yet."} Same scale, morning, before breakfast.
                </p>
              </div>
            </div>
            <WeightLogDialog currentWeight={last?.weightKg} />
          </div>
        )}
        {plateau && (
          <div className="flex flex-col gap-3 border-dusk/20 sm:flex-row sm:items-center sm:justify-between [&:not(:first-child)]:border-t [&:not(:first-child)]:pt-3">
            <div className="flex gap-3">
              <TrendingDown className="h-5 w-5 shrink-0 text-dusk" />
              <div>
                <p className="font-semibold">Your weight has held steady for 3 weeks</p>
                <p className="text-sm text-muted-foreground">
                  Normal now and then. If it continues, check portion sizes in your diary, add steps, or try a different pace.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/plan">Review my plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
