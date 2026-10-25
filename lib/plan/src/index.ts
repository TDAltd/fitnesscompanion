import { computeTargets, calorieFloor } from "./targets";
import { buildSchedule, buildSessions } from "./workouts";
import type { Guideline, Plan, PlanProfile, Targets, TargetOverrides } from "./types";

export * from "./types";
export { computeTargets, PACES, calorieFloor, restingCalories, bmi, ACTIVITY_MULTIPLIERS } from "./targets";
export { buildSchedule, buildSessions, DAY_NAMES } from "./workouts";

const fmtKg = (n: number) => `${Math.round(n * 10) / 10}kg`;
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function avoidHabit(p: PlanProfile): { label: string; short: string } {
  const gp = p.guiltyPleasure?.trim();
  if (gp) return { label: `No ${gp}`, short: `No ${gp.length > 14 ? `${gp.slice(0, 13)}…` : gp}` };
  return { label: "No sugary snacks", short: "No sweets" };
}

function buildGuidelines(p: PlanProfile, t: Targets): Guideline[] {
  const schedule = buildSchedule(p);
  const training = schedule.filter((d) => !d.rest);
  const guidelines: Guideline[] = [];

  guidelines.push({
    id: "workout",
    title: "Workout Structure",
    description: `${training.length} training days, ${7 - training.length} rest days`,
    details: [1, 2, 3, 4, 5, 6, 0].map((d) => `${schedule[d].label.slice(0, 3)}: ${schedule[d].workout}`),
  });

  const diet: string[] = [
    `Daily target: ${t.calories.toLocaleString()} kcal`,
    `Protein: at least ${t.protein}g a day`,
    `Water: ${t.waterLitres}L a day`,
  ];
  if (p.guiltyPleasure?.trim()) diet.push(`Keep ${p.guiltyPleasure.trim()} for planned treats, not every day`);
  if (p.dietaryPreference && p.dietaryPreference !== "No preference") {
    diet.push(`${p.dietaryPreference} meals: meal ideas are filtered for you`);
  }
  guidelines.push({
    id: "diet",
    title: "Diet Rules",
    description:
      t.weeklyChangeKg < -0.05 ? "Protein first, steady calorie deficit" :
      t.weeklyChangeKg > 0.05 ? "Eat enough to build muscle" :
      "Fuel training, keep weight steady",
    details: diet,
  });

  const start = p.currentWeightKg;
  const goal = p.goalWeightKg;
  if (start != null && goal != null && Math.abs(start - goal) >= 1 && Math.abs(t.weeklyChangeKg) >= 0.05 &&
      Math.sign(goal - start) === Math.sign(t.weeklyChangeKg)) {
    const weeks = Math.ceil(Math.abs(goal - start) / Math.abs(t.weeklyChangeKg));
    guidelines.push({
      id: "targets",
      title: "Body Targets",
      description: `${fmtKg(start)} to ${fmtKg(goal)} in about ${weeks} weeks`,
      details: [
        `Start: ${fmtKg(start)}`,
        `Goal: ${fmtKg(goal)}`,
        `Pace: about ${Math.abs(t.weeklyChangeKg).toFixed(2)}kg per week`,
        weeks > 26
          ? "This is a long journey: celebrate every 5kg milestone"
          : "Weigh in at the same time each week, and judge the trend, not single days",
      ],
    });
  } else if (start != null) {
    guidelines.push({
      id: "targets",
      title: "Body Targets",
      description: goal != null && Math.abs(start - goal) >= 1 ? `Working toward ${fmtKg(goal)}` : `Stay around ${fmtKg(start)}`,
      details: [
        `Current: ${fmtKg(start)}`,
        goal != null ? `Goal: ${fmtKg(goal)}` : "No goal weight set",
        "Focus on strength, energy and measurements, not just the scale",
      ],
    });
  }

  const floor = calorieFloor(p.sex);
  guidelines.push({
    id: "plateau",
    title: "Plateau Fix",
    description: "When progress stalls for 2+ weeks",
    details: [
      t.calories - 100 >= floor ? `1. Drop to ${(t.calories - 100).toLocaleString()} kcal` : "1. Keep calories as they are (already at the minimum)",
      `2. Raise steps to ${(t.steps + 2000).toLocaleString()} a day`,
      `3. Hit ${t.waterLitres}L water every day`,
      p.sleepHoursPerNight != null && p.sleepHoursPerNight < 7
        ? `4. Sleep: you said ${p.sleepHoursPerNight}h; aim for 7+`
        : "4. Protect 7+ hours of sleep",
    ],
  });

  guidelines.push({
    id: "phases",
    title: "12-Week Phases",
    description: "How the plan progresses",
    details: [
      "Weeks 1-4: Build the habit; show up, learn the moves",
      "Weeks 5-8: Progress; add weight, reps or minutes each week",
      "Weeks 9-12: Push, then review: update your answers on My plan",
    ],
  });

  return guidelines;
}

export function buildPlan(p: PlanProfile, overrides: TargetOverrides = {}): Plan {
  const targets = computeTargets(p, overrides);
  return {
    targets,
    schedule: buildSchedule(p),
    sessions: buildSessions(p),
    guidelines: buildGuidelines(p, targets),
    avoidHabit: avoidHabit(p),
  };
}

export { capitalise };
