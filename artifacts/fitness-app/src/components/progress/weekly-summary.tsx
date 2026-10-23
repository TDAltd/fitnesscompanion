import { useMemo } from "react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { useListHabits, getListHabitsQueryKey, useListWorkouts, getListWorkoutsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS_GOAL    = 10000;
const WATER_GOAL    = 2.5;
const CAL_MAX       = 1750;
const PROTEIN_MIN   = 120;

type Status = "met" | "missed" | "none";

interface DaySummary {
  date: string;
  label: string;
  shortDate: string;
  isToday: boolean;
  workout: Status;
  steps: Status;
  water: Status;
  biscuits: Status;
  calories: Status;
  protein: Status;
  score: number; // 0–5
}

const columns = [
  { key: "workout",  label: "Workout"   },
  { key: "steps",    label: "Steps"     },
  { key: "water",    label: "Water"     },
  { key: "biscuits", label: "No Sweets" },
  { key: "calories", label: "Calories"  },
  { key: "protein",  label: "Protein"   },
] as const;

function StatusDot({ status }: { status: Status }) {
  if (status === "none") {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted/40">
        <Minus className="h-3 w-3 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <div className={cn(
      "flex items-center justify-center w-7 h-7 rounded-full",
      status === "met" ? "bg-green-500/15" : "bg-red-500/10"
    )}>
      {status === "met"
        ? <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={3} />
        : <X className="h-3.5 w-3.5 text-red-400" strokeWidth={3} />
      }
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const max = 5;
  const pct = (score / max) * 100;
  const color =
    score === 5 ? "bg-green-500" :
    score >= 3  ? "bg-primary"   :
    score >= 1  ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function WeeklySummary() {
  const { data: habits, isLoading: isLoadingHabits } = useListHabits({
    query: { queryKey: getListHabitsQueryKey() }
  });

  const { data: workouts, isLoading: isLoadingWorkouts } = useListWorkouts({
    query: { queryKey: getListWorkoutsQueryKey() }
  });

  const days = useMemo<DaySummary[]>(() => {
    const today = startOfDay(new Date());
    const todayStr = format(today, "yyyy-MM-dd");

    // Build a set of dates with at least one workout logged
    const workoutDates = new Set(
      (workouts ?? []).map(w => w.loggedAt.slice(0, 10))
    );

    // Index habit logs by date
    const habitByDate = new Map(
      (habits ?? []).map(h => [h.date, h])
    );

    return Array.from({ length: 7 }, (_, i) => {
      const d     = subDays(today, 6 - i);
      const dateStr = format(d, "yyyy-MM-dd");
      const habit = habitByDate.get(dateStr);
      const isFuture = d > today;
      const isToday  = dateStr === todayStr;

      const hasWorkout = workoutDates.has(dateStr);
      const workout: Status  = isFuture ? "none" : hasWorkout ? "met" : "missed";

      const steps: Status    = !habit  ? (isFuture ? "none" : "missed")
                             : habit.stepsDone >= STEPS_GOAL ? "met" : "missed";
      const water: Status    = !habit  ? (isFuture ? "none" : "missed")
                             : habit.waterDoneLitres >= WATER_GOAL ? "met" : "missed";
      const biscuits: Status = !habit  ? (isFuture ? "none" : "missed")
                             : habit.biscuitsAvoided ? "met" : "missed";
      const calories: Status = !habit?.caloriesConsumed ? (isFuture ? "none" : "none")
                             : habit.caloriesConsumed <= CAL_MAX ? "met" : "missed";
      const protein: Status  = !habit?.proteinGrams ? (isFuture ? "none" : "none")
                             : habit.proteinGrams >= PROTEIN_MIN ? "met" : "missed";

      const score = [workout, steps, water, biscuits]
        .filter(s => s === "met").length +
        (calories === "met" ? 0.5 : 0) +
        (protein  === "met" ? 0.5 : 0);

      return {
        date: dateStr,
        label: isToday ? "Today" : format(d, "EEE"),
        shortDate: format(d, "d MMM"),
        isToday,
        workout,
        steps,
        water,
        biscuits,
        calories,
        protein,
        score: Math.round(score),
      };
    });
  }, [habits, workouts]);

  const isLoading = isLoadingHabits || isLoadingWorkouts;

  // Calculate week stats
  const metDays    = days.filter(d => d.score >= 4).length;
  const totalDone  = days.filter(d => !d.isToday).length;
  const avgScore   = totalDone > 0
    ? (days.reduce((s, d) => s + d.score, 0) / totalDone).toFixed(1)
    : "—";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4 border-b">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" /> Week at a Glance
            </CardTitle>
            <CardDescription className="mt-1">
              Last 7 days — habits, workouts, and nutrition targets
            </CardDescription>
          </div>
          {!isLoading && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Strong days</p>
                <p className="text-2xl font-black text-primary">{metDays}<span className="text-sm text-muted-foreground font-normal"> / 7</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Avg score</p>
                <p className="text-2xl font-black">{avgScore}<span className="text-sm text-muted-foreground font-normal"> / 5</span></p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* Desktop grid */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider w-28">Habit</th>
                    {days.map(d => (
                      <th key={d.date} className={cn(
                        "text-center p-3 text-xs font-bold uppercase tracking-wider",
                        d.isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div>{d.label}</div>
                        <div className="font-mono font-normal normal-case text-[10px] mt-0.5 opacity-70">{d.shortDate}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, ci) => (
                    <tr key={col.key} className={cn(
                      "border-b border-border/50 last:border-0",
                      ci % 2 === 0 ? "bg-muted/5" : ""
                    )}>
                      <td className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">{col.label}</td>
                      {days.map(d => (
                        <td key={d.date} className={cn(
                          "text-center p-3",
                          d.isToday ? "bg-primary/5" : ""
                        )}>
                          <div className="flex justify-center">
                            <StatusDot status={d[col.key] as Status} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-muted/10">
                    <td className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Score</td>
                    {days.map(d => (
                      <td key={d.date} className={cn("p-3", d.isToday ? "bg-primary/5" : "")}>
                        <div className="text-center font-black text-sm mb-1">{d.score}<span className="text-xs text-muted-foreground font-normal">/5</span></div>
                        <ScoreBar score={d.score} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile card grid */}
            <div className="md:hidden p-4 grid grid-cols-7 gap-1.5">
              {days.map(d => (
                <div key={d.date} className={cn(
                  "rounded-lg p-2 space-y-1.5 border",
                  d.isToday ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                )}>
                  <div className="text-center">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-wide",
                      d.isToday ? "text-primary" : "text-foreground"
                    )}>{d.label.slice(0, 3)}</p>
                    <p className="text-[9px] font-mono text-muted-foreground">{format(parseISO(d.date), "d/M")}</p>
                  </div>
                  <div className="space-y-1">
                    {columns.map(col => (
                      <MobileDot key={col.key} status={d[col.key] as Status} />
                    ))}
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-black">{d.score}</span>
                    <span className="text-[9px] text-muted-foreground">/5</span>
                  </div>
                  <ScoreBar score={d.score} />
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="px-4 md:px-6 pb-4 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border/50 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-green-500" strokeWidth={3} />
                </div>
                <span>Target met</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <X className="h-2.5 w-2.5 text-red-400" strokeWidth={3} />
                </div>
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-muted/40 flex items-center justify-center">
                  <Minus className="h-2.5 w-2.5 text-muted-foreground/40" />
                </div>
                <span>No data logged</span>
              </div>
              <span className="ml-auto font-mono">Score = workout + steps + water + no sweets + cal + protein</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MobileDot({ status }: { status: Status }) {
  return (
    <div className={cn(
      "h-2 w-full rounded-sm",
      status === "met"    ? "bg-green-500/70" :
      status === "missed" ? "bg-red-400/50"   : "bg-muted/40"
    )} />
  );
}
