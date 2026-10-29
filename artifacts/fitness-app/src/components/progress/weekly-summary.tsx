import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Check, X, Minus, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/lib/plan";
import { HABIT_KEYS, useWeekScores, type DayScore, type Status } from "@/lib/day-score";

const LABELS: Record<(typeof HABIT_KEYS)[number], string> = {
  workout: "Workout",
  steps: "Steps",
  water: "Water",
  biscuits: "No sweets",
  calories: "Calories",
  protein: "Protein",
};

const STATUS_TEXT: Record<Status, string> = {
  met: "Done",
  missed: "Missed",
  rest: "Rest day, not counted",
  none: "Food not logged",
};

/** Small progress ring for one day. */
function DayRing({ percent, size = 40, rest }: { percent: number; size?: number; rest?: boolean }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const color = percent >= 80 ? "stroke-primary" : percent >= 40 ? "stroke-[hsl(var(--dusk))]" : "stroke-destructive/70";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={5} className="stroke-muted" />
      {percent > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          className={cn(color, rest && "opacity-90")}
        />
      )}
    </svg>
  );
}

function StatusIcon({ status }: { status: Status }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  if (status === "met") return <span className={cn(base, "bg-primary/15")}><Check className="h-4 w-4 text-primary" strokeWidth={3} /></span>;
  if (status === "missed") return <span className={cn(base, "bg-destructive/10")}><X className="h-4 w-4 text-destructive" strokeWidth={3} /></span>;
  if (status === "rest") return <span className={cn(base, "bg-muted")}><Moon className="h-4 w-4 text-muted-foreground" /></span>;
  return <span className={cn(base, "bg-muted/60")}><Minus className="h-4 w-4 text-muted-foreground/60" /></span>;
}

export function WeeklySummary() {
  const { plan } = usePlan();
  const avoidLabel = plan?.avoidHabit.short ?? "No sweets";
  const { scores, strongDays, averagePercent, isLoading } = useWeekScores(7);
  const [selected, setSelected] = useState<string | null>(null);
  const day: DayScore | undefined = scores.find((s) => s.date === selected) ?? scores.at(-1);
  const label = (k: (typeof HABIT_KEYS)[number]) => (k === "biscuits" ? avoidLabel : LABELS[k]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" /> Your week
            </CardTitle>
            <CardDescription className="mt-1">Tap a day to see what you hit.</CardDescription>
          </div>
          {!isLoading && (
            <div className="flex gap-5 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Strong days</p>
                <p className="text-xl font-semibold text-primary" data-testid="text-strong-days">
                  {strongDays}
                  <span className="text-sm font-normal text-muted-foreground"> / 7</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average day</p>
                <p className="text-xl font-semibold" data-testid="text-average-day">{averagePercent == null ? "–" : `${averagePercent}%`}</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : (
          <>
            {/* Seven days: one tappable ring each */}
            <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Days this week">
              {scores.map((s) => {
                const active = s.date === day?.date;
                return (
                  <button
                    key={s.date}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelected(s.date)}
                    className={cn(
                      "flex min-h-[88px] flex-col items-center gap-1 rounded-xl py-2 transition-colors",
                      active ? "bg-primary/10" : "hover:bg-muted/60",
                    )}
                    data-testid={`day-${s.date}`}
                  >
                    <span className={cn("text-[11px] font-semibold", s.isToday ? "text-primary" : "text-muted-foreground")}>
                      {s.isToday ? "Today" : format(parseISO(s.date), "EEE")}
                    </span>
                    <span className="relative">
                      <DayRing percent={s.percent} rest={s.workout === "rest"} />
                      {s.workout === "rest" && <Moon className="absolute -right-1 -top-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground" data-testid={`score-${s.date}`}>
                      {s.met}/{s.possible}
                    </span>
                    {/* For screen readers and tests: every habit's status that day */}
                    <span className="sr-only">
                      {HABIT_KEYS.map((k) => (
                        <span key={k} data-testid={`status-${k}-${s.date}`} data-status={s[k]}>
                          {label(k)}: {STATUS_TEXT[s[k]]}.{" "}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The chosen day, as a simple checklist */}
            {day && (
              <div className="rounded-xl border p-4" role="tabpanel" data-testid="day-detail">
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="font-semibold">{day.isToday ? "Today" : format(parseISO(day.date), "EEEE d MMM")}</p>
                  <p className="text-sm text-muted-foreground">
                    {day.met} of {day.possible} done{day.strong ? " · strong day" : ""}
                  </p>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {HABIT_KEYS.map((k) => (
                    <li key={k} className="flex items-center gap-3">
                      <StatusIcon status={day[k]} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{label(k)}</span>
                        <span className="block text-xs text-muted-foreground">{STATUS_TEXT[day[k]]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              A strong day is 80% or more of the habits that applied. Rest days don't count against you.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
