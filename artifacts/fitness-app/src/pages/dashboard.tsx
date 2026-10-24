import { format } from "date-fns";
import { Activity, Flame, Target, Trophy, Flame as Fire } from "lucide-react";
import { 
  useGetProgressSummary,
  getGetProgressSummaryQueryKey,
  useGetWorkoutStreak,
  getGetWorkoutStreakQueryKey,
  useGetMealPlan,
  getGetMealPlanQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { HydrationReminder } from "@/components/hydration/hydration-reminder";
import { WeightLogDialog } from "@/components/forms/weight-log-dialog";
import { WorkoutLogDialog } from "@/components/forms/workout-log-dialog";
import { usePlan } from "@/lib/plan";
import { HealthCard } from "@/components/health/health-card";
import { Progress } from "@/components/ui/progress";


export default function DashboardPage() {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const dayOfWeek = today.getDay();
  const { plan } = usePlan();
  const scheduledWorkout = plan?.schedule.find(d => d.day === dayOfWeek);
  const CAL_TARGET = plan?.targets.calories ?? 2000;
  const PROTEIN_TARGET = plan?.targets.protein ?? 100;

  const { data: summary, isLoading: isLoadingSummary } = useGetProgressSummary({
    query: { queryKey: getGetProgressSummaryQueryKey() }
  });

  const { data: streak } = useGetWorkoutStreak({
    query: { queryKey: getGetWorkoutStreakQueryKey() }
  });

  const { data: mealPlanEntries, isLoading: isLoadingMeals } = useGetMealPlan(
    { date: todayStr },
    { query: { queryKey: getGetMealPlanQueryKey({ date: todayStr }) } }
  );

  const totalCalories = mealPlanEntries?.reduce((s, e) => s + e.calories, 0) ?? 0;
  const totalProtein  = mealPlanEntries?.reduce((s, e) => s + e.protein,  0) ?? 0;
  const calPct     = Math.min(100, (totalCalories / CAL_TARGET) * 100);
  const proteinPct = Math.min(100, (totalProtein  / PROTEIN_TARGET) * 100);
  const calOver    = totalCalories > CAL_TARGET;
  const proteinMet = totalProtein  >= PROTEIN_TARGET;
  const hasMeals   = (mealPlanEntries?.length ?? 0) > 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
          TODAY'S MISSION
        </h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {format(today, "EEEE, MMMM do yyyy")}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* GOAL PROGRESS */}
        <Card className="col-span-1 border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-primary flex items-center gap-2">
              <Target className="h-4 w-4" /> Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary || !summary ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tighter">{summary.currentWeight}</span>
                  <span className="text-muted-foreground font-bold">kg</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold font-mono text-muted-foreground">
                    <span>{summary.startWeight}kg</span>
                    <span>{summary.goalWeight}kg</span>
                  </div>
                  <Progress value={summary.percentToGoal} className="h-2" />
                  <p className="text-xs text-muted-foreground font-mono">
                    {summary.weightLost > 0 ? `↓ ${summary.weightLost.toFixed(1)}kg lost` : "Let's get started"} • {summary.percentToGoal.toFixed(0)}% there
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SCHEDULED WORKOUT */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Training
            </CardTitle>
            {streak && streak.currentStreak > 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-sm">
                <Flame className="h-3 w-3" /> {streak.currentStreak} day streak
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Scheduled for today</p>
                <p className="font-bold text-lg leading-tight">
                  {scheduledWorkout?.workout || "Rest Day"}
                </p>
              </div>
              <div className="flex gap-2">
                <WorkoutLogDialog defaultName={scheduledWorkout?.workout} isRest={scheduledWorkout?.rest} />
                <WeightLogDialog currentWeight={summary?.currentWeight} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DIET TARGET — live from meal planner */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider flex items-center gap-2">
              <Fire className="h-4 w-4 text-primary" /> Diet Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMeals ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : hasMeals ? (
              <div className="space-y-4">
                {/* Calories */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-muted-foreground uppercase tracking-wider">Calories</span>
                    <span className={calOver ? "text-red-500" : "text-foreground"}>
                      {totalCalories} / {CAL_TARGET} kcal
                    </span>
                  </div>
                  <Progress
                    value={calPct}
                    className={`h-2 ${calOver ? "[&>div]:bg-red-500" : ""}`}
                  />
                  <p className="text-xs font-mono text-muted-foreground">
                    {calOver
                      ? `${totalCalories - CAL_TARGET} kcal over target`
                      : `${CAL_TARGET - totalCalories} kcal remaining`}
                  </p>
                </div>
                {/* Protein */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-muted-foreground uppercase tracking-wider">Protein</span>
                    <span className={proteinMet ? "text-green-500" : "text-foreground"}>
                      {totalProtein} / {PROTEIN_TARGET}g
                    </span>
                  </div>
                  <Progress
                    value={proteinPct}
                    className={`h-2 ${proteinMet ? "[&>div]:bg-green-500" : ""}`}
                  />
                  <p className="text-xs font-mono text-muted-foreground">
                    {proteinMet
                      ? "Protein target met"
                      : `${PROTEIN_TARGET - totalProtein}g protein to go`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground font-mono pt-1 border-t border-border">
                  From {mealPlanEntries?.length} meal{mealPlanEntries?.length === 1 ? '' : 's'} in today's plan
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold uppercase">Calories</p>
                    <p className="text-2xl font-black">{CAL_TARGET.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground font-mono">kcal target</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-bold uppercase">Protein</p>
                    <p className="text-2xl font-black">{PROTEIN_TARGET}<span className="text-base text-muted-foreground">g</span></p>
                    <p className="text-xs text-muted-foreground font-mono">minimum</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono border-t border-border pt-3">
                  Add meals in the planner to track live totals
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <HealthCard />

      <div className="grid gap-6 md:grid-cols-1">
        <HabitChecklist />
        <HydrationReminder />
      </div>
    </div>
  );
}
