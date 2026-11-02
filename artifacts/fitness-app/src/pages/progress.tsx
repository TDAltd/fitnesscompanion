import { useState } from "react";
import { 
  useGetProgressSummary, 
  getGetProgressSummaryQueryKey,
  useGetWorkoutStreak,
  getGetWorkoutStreakQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Activity, Dumbbell, Flame, TrendingDown, Target, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { useListWorkouts, getListWorkoutsQueryKey, useDeleteWorkout } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeightChart } from "@/components/progress/weight-chart";
import { WeeklySummary } from "@/components/progress/weekly-summary";
import { WeeklyReview } from "@/components/progress/weekly-review";
import { HealthTrends } from "@/components/health/health-trends";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { useWeekScores } from "@/lib/day-score";
import { CalorieChart } from "@/components/progress/calorie-chart";
import { MilestonesCard } from "@/components/milestones/milestones-card";
import { useMilestones } from "@/lib/milestones";

export default function ProgressPage() {
  const week = useWeekScores(7);
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  // A running total that never resets (same count the milestones use)
  const { data: milestones } = useMilestones();
  const daysLogged = Math.max(0, ...(milestones?.milestones ?? []).filter((m) => m.key.startsWith("days-logged-")).map((m) => m.progress.current));
  const { data: summary, isLoading: isLoadingSummary } = useGetProgressSummary({
    query: { queryKey: getGetProgressSummaryQueryKey() }
  });

  const { data: streak, isLoading: isLoadingStreak } = useGetWorkoutStreak({
    query: { queryKey: getGetWorkoutStreakQueryKey() }
  });

  const { data: workouts, isLoading: isLoadingWorkouts } = useListWorkouts({
    query: { queryKey: getListWorkoutsQueryKey() }
  });

  const deleteWorkout = useDeleteWorkout();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDeleteWorkout = (id: number) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
      deleteWorkout.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkoutsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetProgressSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetWorkoutStreakQueryKey() });
          toast({ title: "Workout deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader title="Progress" description="Judge the trend over weeks, not single days." />

      {/* STATS ROW */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="p-6 space-y-2">
            <TrendingDown className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground">Weight lost</p>
            {isLoadingSummary || !summary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{summary.weightLost.toFixed(1)}<span className="text-lg text-muted-foreground">kg</span></p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardContent className="p-6 space-y-2">
            <Dumbbell className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground">Workouts</p>
            {isLoadingSummary || !summary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{summary.totalWorkouts}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20">
          <CardContent className="p-6 space-y-2">
            <Flame className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground">Days logged</p>
            {!milestones ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold text-primary" data-testid="text-days-logged">{daysLogged} <span className="text-lg text-muted-foreground">days</span></p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6 space-y-2">
            <Activity className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground">Strong days this week</p>
            {week.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{week.strongDays}<span className="text-lg text-muted-foreground"> / 7</span></p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WEEKLY SUMMARY */}
      <WeeklySummary />

      <WeeklyReview />


      <CalorieChart />

      {/* STEPS FROM APPLE HEALTH */}
      <HealthTrends />

      {/* WEIGHT CHART */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" /> Weight trend
          </CardTitle>
          <CardDescription>
            {summary?.goalWeight ? `Target: ${summary.goalWeight}kg` : "Your weigh-ins over time"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[300px] w-full p-4 md:p-6 bg-card">
            <WeightChart />
          </div>
        </CardContent>
      </Card>

      {/* RECENT WORKOUTS */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b px-5 py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-primary" /> Training history
          </CardTitle>
          {workouts && workouts.length > 0 && <span className="text-xs text-muted-foreground">Edit sessions in Train</span>}
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingWorkouts ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : workouts && workouts.length > 0 ? (
            <>
              <ul className="divide-y" data-testid="training-history">
                {workouts.slice(0, showAllWorkouts ? 15 : 5).map((workout) => (
                  <li key={workout.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{workout.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(new Date(workout.loggedAt), "EEE d MMM")} · {workout.type}
                        {workout.notes ? ` · ${workout.notes}` : ""}
                      </p>
                    </div>
                    {workout.durationMins ? <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{workout.durationMins} min</span> : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteWorkout(workout.id)}
                      aria-label={`Delete ${workout.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
              {workouts.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllWorkouts((v) => !v)}
                  className="h-10 w-full border-t text-sm font-semibold text-primary hover:bg-primary/5"
                  data-testid="button-more-workouts"
                >
                  {showAllWorkouts ? "Show less" : `Show more (${Math.min(workouts.length, 15) - 5})`}
                </button>
              )}
            </>
          ) : (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">
              <Dumbbell className="mx-auto mb-2 h-6 w-6 opacity-30" />
              No workouts logged yet. Start one from Train.
            </div>
          )}
        </CardContent>
      </Card>

      <MilestonesCard />
    </div>
  );
}
