import { 
  useGetProgressSummary, 
  getGetProgressSummaryQueryKey,
  useGetWorkoutStreak,
  getGetWorkoutStreakQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Activity, Dumbbell, Flame, TrendingDown, Target, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListWorkouts, getListWorkoutsQueryKey, useDeleteWorkout } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WeightChart } from "@/components/progress/weight-chart";
import { WeeklySummary } from "@/components/progress/weekly-summary";
import { HealthTrends } from "@/components/health/health-trends";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProgressPage() {
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
          PROGRESS & STATS
        </h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">
          Data doesn't lie. Track the trend.
        </p>
      </header>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="p-6 space-y-2">
            <TrendingDown className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Weight Lost</p>
            {isLoadingSummary || !summary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-black">{summary.weightLost.toFixed(1)}<span className="text-lg text-muted-foreground">kg</span></p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardContent className="p-6 space-y-2">
            <Dumbbell className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Workouts</p>
            {isLoadingSummary || !summary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-black">{summary.totalWorkouts}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-orange-500/20">
          <CardContent className="p-6 space-y-2">
            <Flame className="h-5 w-5 text-orange-500 mb-2" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Streak</p>
            {isLoadingStreak || !streak ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-black text-orange-500">{streak.currentStreak} <span className="text-lg text-muted-foreground">days</span></p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6 space-y-2">
            <Activity className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Habit Comp.</p>
            {isLoadingSummary || !summary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-black">{summary.habitCompliancePercent ? `${summary.habitCompliancePercent.toFixed(0)}%` : 'N/A'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* WEEKLY SUMMARY */}
      <WeeklySummary />

      {/* SLEEP & STEPS FROM APPLE HEALTH */}
      <HealthTrends />

      {/* WEIGHT CHART */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" /> Weight Trend
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
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" /> Training History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingWorkouts ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : workouts && workouts.length > 0 ? (
            <div className="divide-y divide-border">
              {workouts.slice(0, 10).map((workout) => (
                <div key={workout.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors group">
                  <div className="space-y-1">
                    <p className="font-bold text-lg leading-tight">{workout.name}</p>
                    <div className="flex gap-3 text-xs font-mono text-muted-foreground font-bold uppercase tracking-wider">
                      <span>{format(new Date(workout.loggedAt), "MMM do, HH:mm")}</span>
                      <span>•</span>
                      <span className="text-primary">{workout.type}</span>
                      {workout.durationMins && (
                        <>
                          <span>•</span>
                          <span>{workout.durationMins} min</span>
                        </>
                      )}
                    </div>
                    {workout.notes && <p className="text-sm mt-2">{workout.notes}</p>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    onClick={() => handleDeleteWorkout(workout.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-lg text-foreground">No workouts logged yet</p>
              <p className="text-sm mt-1">Get to work and log your first session.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
