import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Check, X, Minus, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/lib/plan";
import { useWeekScores, type Status } from "@/lib/day-score";

const columns = [
  { key: "workout",  label: "Workout"   },
  { key: "steps",    label: "Steps"     },
  { key: "water",    label: "Water"     },
  { key: "biscuits", label: "No Sweets" },
  { key: "calories", label: "Calories"  },
  { key: "protein",  label: "Protein"   },
] as const;

function StatusDot({ status }: { status: Status }) {
  if (status === "rest") {
    return (
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted/60" title="Rest day: not counted">
        <Moon className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }
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
      status === "met" ? "bg-primary/15" : "bg-destructive/10"
    )}>
      {status === "met"
        ? <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
        : <X className="h-3.5 w-3.5 text-destructive" strokeWidth={3} />
      }
    </div>
  );
}

function ScoreBar({ percent }: { percent: number }) {
  const color = percent >= 80 ? "bg-primary" : percent >= 40 ? "bg-dusk" : "bg-destructive";
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function WeeklySummary() {
  const { plan } = usePlan();
  const avoidLabel = plan?.avoidHabit.short ?? "No sweets";
  const { scores, strongDays, averagePercent, isLoading } = useWeekScores(7);
  const days = scores.map((s) => ({
    ...s,
    label: s.isToday ? "Today" : format(parseISO(s.date), "EEE"),
    shortDate: format(parseISO(s.date), "d MMM"),
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4 border-b">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" /> Week at a glance
            </CardTitle>
            <CardDescription className="mt-1">
              Last 7 days. Each habit is 1 point; rest days don't count either way.
            </CardDescription>
          </div>
          {!isLoading && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">Strong days</p>
                <p className="text-2xl font-semibold text-primary" data-testid="text-strong-days">{strongDays}<span className="text-sm text-muted-foreground font-normal"> / 7</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average day</p>
                <p className="text-2xl font-semibold" data-testid="text-average-day">{averagePercent == null ? "–" : `${averagePercent}%`}</p>
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
                    <th className="text-left p-4 text-xs font-bold text-muted-foreground w-28">Habit</th>
                    {days.map(d => (
                      <th key={d.date} className={cn(
                        "text-center p-3 text-xs font-bold",
                        d.isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        <div>{d.label}</div>
                        <div className="font-normal normal-case text-[10px] mt-0.5 opacity-70">{d.shortDate}</div>
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
                      <td className="p-4 text-xs font-bold text-muted-foreground">{col.key === "biscuits" ? avoidLabel : col.label}</td>
                      {days.map(d => (
                        <td key={d.date} className={cn(
                          "text-center p-3",
                          d.isToday ? "bg-primary/5" : ""
                        )}>
                          <div className="flex justify-center" data-testid={`status-${col.key}-${d.date}`} data-status={d[col.key]}>
                            <StatusDot status={d[col.key] as Status} />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-muted/10">
                    <td className="p-4 text-xs font-bold text-muted-foreground">Score</td>
                    {days.map(d => (
                      <td key={d.date} className={cn("p-3", d.isToday ? "bg-primary/5" : "")}>
                        <div className="text-center font-semibold text-sm mb-1" data-testid={`score-${d.date}`}>{d.met}<span className="text-xs text-muted-foreground font-normal">/{d.possible}</span></div>
                        <ScoreBar percent={d.percent} />
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
                      "text-[10px] font-semibold tracking-wide",
                      d.isToday ? "text-primary" : "text-foreground"
                    )}>{d.label.slice(0, 3)}</p>
                    <p className="text-[9px] text-muted-foreground">{format(parseISO(d.date), "d/M")}</p>
                  </div>
                  <div className="space-y-1">
                    {columns.map(col => (
                      <MobileDot key={col.key} status={d[col.key] as Status} />
                    ))}
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-semibold">{d.met}</span>
                    <span className="text-[9px] text-muted-foreground">/{d.possible}</span>
                  </div>
                  <ScoreBar percent={d.percent} />
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="px-4 md:px-6 pb-4 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border/50 pt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary" strokeWidth={3} />
                </div>
                <span>Target met</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="h-2.5 w-2.5 text-destructive" strokeWidth={3} />
                </div>
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-muted/40 flex items-center justify-center">
                  <Minus className="h-2.5 w-2.5 text-muted-foreground/40" />
                </div>
                <span>Food not logged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-muted/60 flex items-center justify-center">
                  <Moon className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <span>Rest day (not counted)</span>
              </div>
              <span className="ml-auto">Strong day = 80% or more of the habits that applied</span>
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
      status === "met"    ? "bg-primary/70" :
      status === "missed" ? "bg-destructive/50" : status === "rest" ? "bg-muted" : "bg-muted/40"
    )} />
  );
}
