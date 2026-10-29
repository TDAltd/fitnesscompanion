import { useMemo } from "react";
import { format, startOfDay, subDays } from "date-fns";
import { useListHabits, getListHabitsQueryKey, useListWorkouts, getListWorkoutsQueryKey } from "@workspace/api-client-react";
import { usePlan } from "./plan";
import { targetFor, useFoodTotals, useTreats } from "./food-log";

/**
 * One set of rules for "did I hit it today?", shared by the Today ring and the Progress week grid,
 * so the two screens can never disagree.
 *
 * Six habits, one point each. A rest day with no workout is "rest": neutral, not counted either way.
 * A workout on a rest day (or any day) counts as met. A day's score is points met / habits that applied.
 */
export type Status = "met" | "missed" | "rest" | "none";

/** On target = 80–100% of the day's target (+50 kcal). With habitFocus, eating enough is all that counts. */
export const caloriesMet = (kcal: number, target: number, habitFocus = false) =>
  kcal >= target * 0.8 && (habitFocus || kcal <= target + 50);
export const proteinMet = (grams: number, target: number) => grams >= target - 10;

export interface DayScore {
  date: string;
  isToday: boolean;
  workout: Status;
  steps: Status;
  water: Status;
  biscuits: Status;
  calories: Status;
  protein: Status;
  met: number;
  possible: number;
  /** 0–100 */
  percent: number;
  /** 80%+ of what applied */
  strong: boolean;
}

export const HABIT_KEYS = ["workout", "steps", "water", "biscuits", "calories", "protein"] as const;

export function useWeekScores(days = 7) {
  const { plan } = usePlan();
  const today = startOfDay(new Date());
  const to = format(today, "yyyy-MM-dd");
  const from = format(subDays(today, days - 1), "yyyy-MM-dd");
  const habitsQ = useListHabits({ query: { queryKey: getListHabitsQueryKey() } });
  const workoutsQ = useListWorkouts({ query: { queryKey: getListWorkoutsQueryKey() } });
  const foodQ = useFoodTotals(from, to);
  const treatsQ = useTreats(from, to);

  const scores = useMemo<DayScore[]>(() => {
    if (!plan) return [];
    const t = plan.targets;
    const restDays = new Set(plan.schedule.filter((d) => d.rest).map((d) => d.day));
    const workoutDates = new Set((workoutsQ.data ?? []).map((w) => format(new Date(w.loggedAt), "yyyy-MM-dd")));
    const habitByDate = new Map((habitsQ.data ?? []).map((h) => [h.date, h]));
    const foodByDate = new Map((foodQ.data ?? []).map((f) => [f.date, f]));

    return Array.from({ length: days }, (_, i) => {
      const d = subDays(today, days - 1 - i);
      const date = format(d, "yyyy-MM-dd");
      const isToday = date === to;
      const habit = habitByDate.get(date);
      const food = foodByDate.get(date);
      const yesNo = (ok: boolean): Status => (ok ? "met" : "missed");

      const workout: Status = workoutDates.has(date) ? "met" : restDays.has(d.getDay()) ? "rest" : "missed";
      const steps = yesNo((habit?.stepsDone ?? 0) >= (habit?.stepsGoal || t.steps));
      const water = yesNo((habit?.waterDoneLitres ?? 0) >= (habit?.waterGoalLitres || t.waterLitres));
      const biscuits = yesNo(Boolean(habit?.biscuitsAvoided));
      const kcal = food?.calories ?? habit?.caloriesConsumed ?? 0;
      const prot = food?.protein ?? habit?.proteinGrams ?? 0;
      const calories: Status = kcal ? yesNo(caloriesMet(kcal, targetFor(date, t.calories, treatsQ.data), t.habitFocus)) : "none";
      const protein: Status = prot ? yesNo(proteinMet(prot, t.protein)) : "none";

      const all = [workout, steps, water, biscuits, calories, protein];
      const counted = all.filter((s) => s !== "rest");
      const met = counted.filter((s) => s === "met").length;
      const possible = counted.length;
      const percent = possible ? Math.round((met / possible) * 100) : 0;
      return { date, isToday, workout, steps, water, biscuits, calories, protein, met, possible, percent, strong: percent >= 80 };
    });
  }, [plan, habitsQ.data, workoutsQ.data, foodQ.data, treatsQ.data, days, to]);

  const past = scores.filter((s) => !s.isToday);
  return {
    scores,
    strongDays: scores.filter((s) => s.strong).length,
    averagePercent: past.length ? Math.round(past.reduce((a, s) => a + s.percent, 0) / past.length) : null,
    isLoading: habitsQ.isLoading || workoutsQ.isLoading || foodQ.isLoading || !plan,
  };
}
