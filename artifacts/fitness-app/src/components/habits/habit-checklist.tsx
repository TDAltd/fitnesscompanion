import { Activity, Droplets, Cookie, Utensils, CheckCircle, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetTodayHabits, 
  getGetTodayHabitsQueryKey,
  useUpsertHabit,
  useGetMealPlan,
  getGetMealPlanQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/lib/plan";

export function HabitChecklist() {
  const { plan } = usePlan();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: habits, isLoading } = useGetTodayHabits({
    query: { queryKey: getGetTodayHabitsQueryKey() }
  });

  const { data: mealPlanEntries } = useGetMealPlan(
    { date: today },
    { query: { queryKey: getGetMealPlanQueryKey({ date: today }) } }
  );

  const upsertMutation = useUpsertHabit();

  const [localState, setLocalState] = useState({
    stepsDone: 0,
    waterDoneLitres: 0,
    biscuitsAvoided: false,
    caloriesConsumed: '',
    proteinGrams: ''
  });

  const initializedRef = useRef(false);
  const prevMealPlanTotalsRef = useRef<{ cal: number; prot: number } | null>(null);

  // Initialise from saved habit data on first load
  useEffect(() => {
    if (habits && !initializedRef.current) {
      setLocalState({
        stepsDone: habits.stepsDone || 0,
        waterDoneLitres: habits.waterDoneLitres || 0,
        biscuitsAvoided: habits.biscuitsAvoided || false,
        caloriesConsumed: habits.caloriesConsumed?.toString() || '',
        proteinGrams: habits.proteinGrams?.toString() || ''
      });
      initializedRef.current = true;
    }
  }, [habits]);

  // When meal plan changes, auto-sync calories + protein into habits
  useEffect(() => {
    if (!mealPlanEntries) return;

    const totalCal = mealPlanEntries.reduce((s, e) => s + e.calories, 0);
    const totalProt = mealPlanEntries.reduce((s, e) => s + e.protein, 0);

    const prev = prevMealPlanTotalsRef.current;
    const changed = !prev || prev.cal !== totalCal || prev.prot !== totalProt;
    if (!changed) return;

    prevMealPlanTotalsRef.current = { cal: totalCal, prot: totalProt };

    if (totalCal === 0 && totalProt === 0) return;

    const newCal = totalCal.toString();
    const newProt = totalProt.toString();

    setLocalState(prev => ({ ...prev, caloriesConsumed: newCal, proteinGrams: newProt }));

    queryClient.setQueryData(getGetTodayHabitsQueryKey(), (old: any) => {
      if (!old) return old;
      return { ...old, caloriesConsumed: totalCal, proteinGrams: totalProt };
    });

    upsertMutation.mutate({
      data: {
        date: today,
        caloriesConsumed: totalCal,
        proteinGrams: totalProt,
      }
    });
  }, [mealPlanEntries]);

  const updateHabits = (updates: Partial<typeof localState>) => {
    const newState = { ...localState, ...updates };
    setLocalState(newState);
    
    queryClient.setQueryData(getGetTodayHabitsQueryKey(), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        ...updates,
        caloriesConsumed: newState.caloriesConsumed ? Number(newState.caloriesConsumed) : null,
        proteinGrams: newState.proteinGrams ? Number(newState.proteinGrams) : null,
      };
    });

    upsertMutation.mutate({
      data: {
        date: today,
        stepsDone: newState.stepsDone,
        waterDoneLitres: newState.waterDoneLitres,
        biscuitsAvoided: newState.biscuitsAvoided,
        caloriesConsumed: newState.caloriesConsumed ? Number(newState.caloriesConsumed) : undefined,
        proteinGrams: newState.proteinGrams ? Number(newState.proteinGrams) : undefined,
      }
    }, {
      onError: () => {
        toast({
          title: "Failed to save",
          description: "Could not save your progress.",
          variant: "destructive"
        });
        queryClient.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const stepsGoal = habits?.stepsGoal || plan?.targets.steps || 8000;
  const waterGoal = habits?.waterGoalLitres || plan?.targets.waterLitres || 2.5;

  const mealPlanCalories = mealPlanEntries?.reduce((s, e) => s + e.calories, 0) ?? 0;
  const mealPlanProtein = mealPlanEntries?.reduce((s, e) => s + e.protein, 0) ?? 0;

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" /> Daily checklist
        </CardTitle>
        <CardDescription>
          Tick things off as you go.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {/* Biscuits Avoided */}
          <div className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-md">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="biscuits" className="font-bold text-base cursor-pointer">{plan?.avoidHabit.label ?? "No sugary snacks"}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Keep it for planned treats</p>
              </div>
            </div>
            <Checkbox 
              id="biscuits" 
              className="h-6 w-6"
              checked={localState.biscuitsAvoided}
              onCheckedChange={(checked) => updateHabits({ biscuitsAvoided: !!checked })}
            />
          </div>

          {/* Water */}
          <div className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-dusk/10 p-2 rounded-md">
                <Droplets className="h-5 w-5 text-dusk" />
              </div>
              <div className="flex-1">
                <Label className="font-bold text-base">Water</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Goal: {waterGoal}L</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => updateHabits({ waterDoneLitres: Math.max(0, localState.waterDoneLitres - 0.5) })}
                disabled={localState.waterDoneLitres <= 0}
              >
                -
              </Button>
              <div className="w-16 text-center font-bold">
                {localState.waterDoneLitres.toFixed(1)}L
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => updateHabits({ waterDoneLitres: localState.waterDoneLitres + 0.5 })}
              >
                +
              </Button>
            </div>
          </div>

          {/* Steps */}
          <div className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors flex-wrap gap-4">
            <div className="flex items-center gap-3 min-w-[200px]">
              <div className="bg-primary/10 p-2 rounded-md">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-bold text-base">Steps</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Goal: {stepsGoal.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input 
                type="number" 
                value={localState.stepsDone || ''} 
                onChange={(e) => setLocalState({ ...localState, stepsDone: Number(e.target.value) })}
                onBlur={() => updateHabits({ stepsDone: localState.stepsDone })}
                className="w-full sm:w-24 text-right font-bold"
                placeholder="0"
              />
              <span className="text-sm font-bold text-muted-foreground">steps</span>
            </div>
          </div>

          {/* Food comes from the Eat diary (synced to habits automatically) */}
          <Link href="/meals" className="p-4 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-dusk/10 p-2 rounded-md">
                <Utensils className="h-5 w-5 text-dusk" />
              </div>
              <div>
                <p className="font-bold text-base">Food</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mealPlanCalories > 0
                    ? `${mealPlanCalories.toLocaleString()} kcal · ${mealPlanProtein} g protein logged`
                    : "Nothing logged yet"}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary flex items-center gap-1">
              Open diary <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
