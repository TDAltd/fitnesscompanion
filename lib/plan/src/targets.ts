import type { Pace, PlanProfile, TargetOverrides, Targets } from "./types";

/** Daily calorie gap per pace (7,700 kcal is roughly 1 kg). */
export const PACES: Record<Pace, { deficit: number; label: string; perWeek: string }> = {
  gentle: { deficit: 250, label: "Gentle", perWeek: "about 0.25 kg a week" },
  steady: { deficit: 500, label: "Steady", perWeek: "about 0.5 kg a week" },
  faster: { deficit: 750, label: "Faster", perWeek: "about 0.7 kg a week" },
};
const isPace = (v: unknown): v is Pace => v === "gentle" || v === "steady" || v === "faster";

export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  Sedentary: 1.2,
  "Lightly Active": 1.375,
  "Moderately Active": 1.55,
  "Very Active": 1.725,
};

const BASE_STEPS: Record<string, number> = {
  Sedentary: 7000,
  "Lightly Active": 8000,
  "Moderately Active": 10000,
  "Very Active": 12000,
};

/** Lowest daily calorie target the app will ever suggest (general guidance without medical supervision). */
export function calorieFloor(sex: string | null | undefined): number {
  if (sex === "Male") return 1500;
  if (sex === "Female") return 1200;
  return 1350;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Mifflin-St Jeor resting energy, same formula as the calorie calculator page. */
export function restingCalories(p: PlanProfile): number | null {
  const { ageYears: age, heightCm: h, currentWeightKg: w, sex } = p;
  if (!age || !h || !w) return null;
  const sexAdj = sex === "Male" ? 5 : sex === "Female" ? -161 : -78;
  return 10 * w + 6.25 * h - 5 * age + sexAdj;
}

export function bmi(p: PlanProfile): number | null {
  if (!p.heightCm || !p.currentWeightKg) return null;
  const m = p.heightCm / 100;
  return p.currentWeightKg / (m * m);
}

const valid = (n: number | null | undefined, min: number, max: number): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;

export function computeTargets(p: PlanProfile, overrides: TargetOverrides = {}): Targets {
  const notes: string[] = [];
  const weight = p.currentWeightKg ?? 70;
  const goal = p.fitnessGoal ?? "General fitness";
  const isMinor = typeof p.ageYears === "number" && p.ageYears < 18;
  const bodyMassIndex = bmi(p);
  const wantsToLose =
    goal === "Weight loss" ||
    (p.goalWeightKg != null && p.currentWeightKg != null && p.goalWeightKg < p.currentWeightKg - 2);

  // ---- calories ----
  const bmr = restingCalories(p);
  const multiplier = ACTIVITY_MULTIPLIERS[p.activityLevel ?? ""] ?? 1.375;
  const maintenance = bmr != null ? bmr * multiplier : null;

  let adjustment = 0; // negative = deficit, positive = surplus
  let pace: Pace | null = null;
  const underweight = bodyMassIndex != null && bodyMassIndex < 18.5;
  const paceAvailable = wantsToLose && !isMinor && !underweight && goal !== "Build strength";
  if (isMinor) {
    notes.push("Under 18: the plan aims for maintenance, not a calorie deficit.");
  } else if (bodyMassIndex != null && bodyMassIndex < 18.5 && wantsToLose) {
    notes.push("Your BMI is already in the underweight range, so the plan does not cut calories.");
  } else if (paceAvailable && isPace(overrides.pace)) {
    pace = overrides.pace;
    adjustment = -PACES[pace].deficit;
  } else if (goal === "Weight loss") {
    adjustment = bodyMassIndex != null && bodyMassIndex >= 30 ? -500 : -350;
  } else if (goal === "Build strength") {
    adjustment = bodyMassIndex != null && bodyMassIndex >= 25 ? 0 : 200;
  } else if (wantsToLose) {
    adjustment = -250;
  }

  let autoCalories = maintenance != null ? maintenance + adjustment : 2000;
  const floor = calorieFloor(p.sex);
  if (autoCalories < floor) {
    autoCalories = floor;
    notes.push(`Calories are set to the ${floor} kcal minimum the app will suggest.`);
  }
  autoCalories = roundTo(autoCalories, 25);

  // ---- protein (g per kg of a reference weight) ----
  const perKg =
    goal === "Build strength" ? 1.8 : goal === "Weight loss" ? 1.6 : 1.4;
  const referenceWeight =
    wantsToLose && p.goalWeightKg ? Math.max(p.goalWeightKg, weight * 0.75) : weight;
  const autoProtein = clamp(roundTo(referenceWeight * perKg, 5), 60, 220);

  // ---- steps ----
  let autoSteps = BASE_STEPS[p.activityLevel ?? ""] ?? 8000;
  if (wantsToLose) autoSteps = Math.min(12000, autoSteps + 1000);

  // ---- water (about 33 ml per kg, 2-4 L) ----
  const autoWater = clamp(Math.round(weight * 0.033 * 4) / 4, 2, 4);

  const calories = valid(overrides.calorieTarget, 800, 6000) ? Math.round(overrides.calorieTarget) : autoCalories;
  const protein = valid(overrides.proteinTarget, 20, 400) ? Math.round(overrides.proteinTarget) : autoProtein;
  const steps = valid(overrides.stepsGoal, 1000, 50000) ? Math.round(overrides.stepsGoal) : autoSteps;
  const waterLitres = valid(overrides.waterGoalLitres, 0.5, 8) ? overrides.waterGoalLitres : autoWater;

  // Expected weekly change from the calorie gap (7,700 kcal ~ 1 kg)
  const dailyGap = maintenance != null ? calories - maintenance : adjustment;
  const weeklyChangeKg = Math.round(((dailyGap * 7) / 7700) * 100) / 100;

  return {
    calories,
    protein,
    steps,
    waterLitres,
    maintenance: maintenance != null ? roundTo(maintenance, 25) : null,
    weeklyChangeKg,
    auto: { calories: autoCalories, protein: autoProtein, steps: autoSteps, waterLitres: autoWater },
    overridden: {
      calories: calories !== autoCalories,
      protein: protein !== autoProtein,
      steps: steps !== autoSteps,
      waterLitres: waterLitres !== autoWater,
    },
    notes,
    pace,
    paceAvailable,
  };
}
