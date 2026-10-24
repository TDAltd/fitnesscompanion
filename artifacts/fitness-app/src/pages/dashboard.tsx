import { format } from "date-fns";
import { Link } from "wouter";
import { Check, Dumbbell, Footprints, Droplets, Salad, Beef, Ban, Scale, ChevronRight } from "lucide-react";
import {
  useGetProgressSummary,
  getGetProgressSummaryQueryKey,
  useGetWorkoutStreak,
  getGetWorkoutStreakQueryKey,
  useGetMealPlan,
  getGetMealPlanQueryKey,
  useGetTodayHabits,
  getGetTodayHabitsQueryKey,
  useListWorkouts,
  getListWorkoutsQueryKey,
  useGetProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { HydrationReminder } from "@/components/hydration/hydration-reminder";
import { WeightLogDialog } from "@/components/forms/weight-log-dialog";
import { WorkoutLogDialog } from "@/components/forms/workout-log-dialog";
import { HealthCard } from "@/components/health/health-card";
import { RhythmRing } from "@/components/today/rhythm-ring";
import { usePlan } from "@/lib/plan";
import { cn } from "@/lib/utils";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const { plan } = usePlan();
  const scheduled = plan?.schedule.find((d) => d.day === today.getDay());
  const calTarget = plan?.targets.calories ?? 2000;
  const proteinTarget = plan?.targets.protein ?? 100;

  const { data: profile } = useGetProfile({ query: { queryKey: getGetProfileQueryKey() } });
  const { data: summary, isLoading: loadingSummary } = useGetProgressSummary({ query: { queryKey: getGetProgressSummaryQueryKey() } });
  const { data: streak } = useGetWorkoutStreak({ query: { queryKey: getGetWorkoutStreakQueryKey() } });
  const { data: habits } = useGetTodayHabits({ query: { queryKey: getGetTodayHabitsQueryKey() } });
  const { data: workouts } = useListWorkouts({ query: { queryKey: getListWorkoutsQueryKey() } });
  const { data: meals, isLoading: loadingMeals } = useGetMealPlan(
    { date: todayStr },
    { query: { queryKey: getGetMealPlanQueryKey({ date: todayStr }) } },
  );

  const calories = meals?.reduce((s, e) => s + e.calories, 0) ?? 0;
  const protein = meals?.reduce((s, e) => s + e.protein, 0) ?? 0;
  const workedOutToday = (workouts ?? []).some((w) => format(new Date(w.loggedAt), "yyyy-MM-dd") === todayStr);
  const stepsGoal = habits?.stepsGoal || plan?.targets.steps || 8000;
  const waterGoal = habits?.waterGoalLitres || plan?.targets.waterLitres || 2.5;

  // The six things that make up "today's plan"
  const items = [
    {
      key: "move",
      icon: Dumbbell,
      label: scheduled?.rest ? "Rest day" : "Workout",
      done: scheduled?.rest ? true : workedOutToday,
      detail: scheduled?.rest ? "Recovery counts" : workedOutToday ? "Logged" : scheduled?.workout ?? "Planned session",
    },
    {
      key: "steps",
      icon: Footprints,
      label: "Steps",
      done: (habits?.stepsDone ?? 0) >= stepsGoal,
      detail: `${(habits?.stepsDone ?? 0).toLocaleString()} of ${stepsGoal.toLocaleString()}`,
    },
    {
      key: "water",
      icon: Droplets,
      label: "Water",
      done: (habits?.waterDoneLitres ?? 0) >= waterGoal,
      detail: `${habits?.waterDoneLitres ?? 0} of ${waterGoal}L`,
    },
    {
      key: "food",
      icon: Salad,
      label: "Calories",
      // "Done" once you've eaten most of your target without going over
      done: calories >= calTarget * 0.8 && calories <= calTarget + 50,
      detail: calories > 0 ? `${calories.toLocaleString()} of ${calTarget.toLocaleString()} kcal` : "Nothing logged yet",
    },
    {
      key: "protein",
      icon: Beef,
      label: "Protein",
      done: protein >= proteinTarget - 10,
      detail: `${protein}g of ${proteinTarget}g`,
    },
    {
      key: "avoid",
      icon: Ban,
      label: plan?.avoidHabit.label ?? "No sugary snacks",
      done: Boolean(habits?.biscuitsAvoided),
      detail: habits?.biscuitsAvoided ? "Done" : "Tick it off tonight",
    },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6 md:space-y-8">
      <header>
        <p className="text-sm font-semibold text-muted-foreground">{format(today, "EEEE d MMMM")}</p>
        <h1 className="mt-1 font-display text-[28px] font-medium leading-tight tracking-[-0.02em] md:text-[34px]">
          {greeting(today.getHours())}{firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      {/* Daily rhythm */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-center sm:gap-10 md:p-8">
          <RhythmRing done={doneCount} total={items.length} />
          <div className="w-full min-w-0 flex-1">
            <p className="mb-3 font-display text-lg font-medium">
              {doneCount === items.length
                ? "Everything done today. Well paced."
                : doneCount === 0
                  ? "Your plan for today"
                  : `${items.length - doneCount} left for today`}
            </p>
            <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {items.map(({ key, icon: Icon, label, done, detail }) => (
                <li key={key} className="flex items-center gap-3" data-testid={`today-item-${key}`}>
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Today's session */}
        <Card>
          <CardContent className="flex h-full flex-col gap-4 p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Today's session</p>
                <p className="mt-1 font-display text-xl font-medium leading-snug">{scheduled?.workout ?? "Rest day"}</p>
              </div>
              {streak && streak.currentStreak > 0 && (
                <span className="shrink-0 rounded-full bg-dusk/15 px-2.5 py-1 text-xs font-semibold text-foreground">
                  {streak.currentStreak}-day streak
                </span>
              )}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <WorkoutLogDialog defaultName={scheduled?.workout} isRest={scheduled?.rest} />
              {!scheduled?.rest && (
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link href="/workout">
                    See exercises <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Food today */}
        <Card>
          <CardContent className="flex h-full flex-col gap-4 p-5 md:p-6">
            <p className="text-sm font-semibold text-muted-foreground">Food today</p>
            {loadingMeals ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Calories", value: calories, target: calTarget, unit: " kcal", over: calories > calTarget },
                  { label: "Protein", value: protein, target: proteinTarget, unit: "g", over: false },
                ].map((m) => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold">{m.label}</span>
                      <span className={cn("tabular-nums", m.over ? "font-semibold text-destructive" : "text-muted-foreground")}>
                        {m.value.toLocaleString()} / {m.target.toLocaleString()}
                        {m.unit}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (m.value / m.target) * 100)}
                      className={cn("h-2", m.over && "[&>div]:bg-destructive")}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="mt-auto w-fit">
              <Link href="/meals">{(meals?.length ?? 0) > 0 ? "Add or change meals" : "Plan today's meals"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <HabitChecklist />

      <HealthCard />

      {/* Weight */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          {loadingSummary || !summary ? (
            <Skeleton className="h-12 w-48" />
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Scale className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-xl font-medium tabular-nums">
                  {summary.currentWeight}kg
                  <span className="ml-2 text-sm font-normal text-muted-foreground">goal {summary.goalWeight}kg</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {summary.weightLost > 0
                    ? `${summary.weightLost.toFixed(1)}kg down, ${summary.percentToGoal.toFixed(0)}% of the way`
                    : "Log your weight once a week, same time of day"}
                </p>
              </div>
            </div>
          )}
          <WeightLogDialog currentWeight={summary?.currentWeight} />
        </CardContent>
      </Card>

      <HydrationReminder />
    </div>
  );
}
