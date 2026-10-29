import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, Moon, Play } from "lucide-react";
import { getListWorkoutsQueryKey, useListWorkouts } from "@workspace/api-client-react";
import type { Plan, Session } from "@workspace/plan";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Top of Train: what today's plan says to do, with one tap to start it. */
export function TodaySession({ plan, onStart }: { plan: Plan; onStart: (s: Session) => void }) {
  const { data: workouts } = useListWorkouts({ query: { queryKey: getListWorkoutsQueryKey() } });
  const [showOptions, setShowOptions] = useState(false);
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const day = plan.schedule.find((d) => d.day === today.getDay());
  const session = plan.sessions.find((s) => s.id === day?.sessionId) ?? null;
  const doneToday = (workouts ?? []).filter((w) => format(new Date(w.loggedAt), "yyyy-MM-dd") === todayStr);

  return (
    <Card className="overflow-hidden border-primary/25" data-testid="today-session">
      <CardContent className="space-y-4 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Today · {format(today, "EEEE")}</p>
            <h2 className="mt-1 font-display text-2xl font-medium leading-tight">{session ? session.title : "Rest day"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {session ? session.focus : day?.workout ?? "Rest or a relaxed 20-minute walk. Recovery is part of the plan."}
            </p>
          </div>
          {session ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" /> {session.durationMinutes} min
            </span>
          ) : (
            <Moon className="h-6 w-6 shrink-0 text-muted-foreground" />
          )}
        </div>

        {doneToday.length > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary" data-testid="today-done">
            <CheckCircle2 className="h-4 w-4" /> Done today: {doneToday.map((w) => w.name).join(", ")}
          </p>
        )}

        {session && (
          <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {session.exercises.map((e, i) => (
              <li key={e.name + i} className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                <span className="min-w-0 truncate font-medium">{e.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{e.sets} × {e.reps}</span>
              </li>
            ))}
          </ol>
        )}

        {session ? (
          <Button className="h-12 w-full gap-2 text-base" onClick={() => onStart(session)} data-testid="button-start-today">
            <Play className="h-4 w-4" /> {doneToday.length ? "Do it again" : "Start today's session"}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button variant="outline" className="h-11 w-full" onClick={() => setShowOptions((s) => !s)} data-testid="button-train-anyway">
              {showOptions ? "Hide sessions" : "Feel like training anyway?"}
            </Button>
            {showOptions && (
              <div className="grid gap-2 sm:grid-cols-2">
                {plan.sessions.map((s) => (
                  <Button key={s.id} variant="secondary" className="h-11 justify-start gap-2" onClick={() => onStart(s)}>
                    <Play className="h-4 w-4" /> {s.title}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
