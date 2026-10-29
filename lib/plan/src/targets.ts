import type { Pace, PlanProfile, TargetOverrides, Targets } from "./types";

/** Daily calorie gap per pace (7,700 kcal is roughly 1 kg). */
/** kg per week from a daily calorie gap, rounded to the nearest 0.05 kg (used everywhere it's shown). */
export const kgPerWeek = (dailyGap: number) => Math.round(((dailyGap * 7) / 7700) * 20) / 20;
const perWeekLabel = (deficit: number) => `about ${Math.abs(kgPerWeek(deficit)).toFixed(2).replace(/0$/, "")} kg a week`;
export const PACES: Record<Pace, { deficit: number; label: string; perWeek: string }> = {
  gentle: { deficit: 250, label: "Gentle", perWeek: perWeekLabel(250) },
  steady: { deficit: 500, label: "Steady", perWeek: perWeekLabel(500) },
  faster: { deficit: 750, label: "Faster", perWeek: perWeekLabel(750) },
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
  let paceIsDefault = false;
  const underweight = bodyMassIndex != null && bodyMassIndex < 18.5;
  const flags = new Set(p.healthFlags ?? []);
  const pregnantOrFeeding = flags.has("pregnant") || flags.has("breastfeeding");
  const habitFocus = flags.has("eating-disorder");
  const noDeficit = pregnantOrFeeding || habitFocus;
  const allowedPaces: Pace[] = flags.has("diabetes") ? ["gentle"] : ["gentle", "steady", "faster"];
  const paceAvailable = wantsToLose && !isMinor && !underweight && !noDeficit && goal !== "Build strength";
  if (pregnantOrFeeding) {
    notes.push("Pregnant or breastfeeding: the plan aims for maintenance, not weight loss. Follow your midwife's or doctor's advice on food and exercise.");
  } else if (habitFocus) {
    notes.push("Your plan focuses on regular, balanced meals rather than cutting calories. A doctor or dietitian can help you set safe goals.");
  } else if (isMinor) {
    notes.push("Under 18: the plan aims for maintenance, not a calorie deficit.");
  } else if (bodyMassIndex != null && bodyMassIndex < 18.5 && wantsToLose) {
    notes.push("Your BMI is already in the underweight range, so the plan does not cut calories.");
  } else if (paceAvailable) {
    // Your chosen pace, else the app's pick: steady with a BMI of 30+, gentle otherwise
    const chosen = isPace(overrides.pace) && allowedPaces.includes(overrides.pace) ? overrides.pace : null;
    pace = chosen ?? (bodyMassIndex != null && bodyMassIndex >= 30 && allowedPaces.includes("steady") ? "steady" : "gentle");
    paceIsDefault = !chosen;
    if (flags.has("diabetes")) notes.push("Diabetes: the plan keeps to a gentle pace. Check with your doctor, especially if you take medicine that can cause low blood sugar.");
    adjustment = -PACES[pace].deficit;
  } else if (goal === "Build strength" && !noDeficit) {
    adjustment = bodyMassIndex != null && bodyMassIndex >= 25 ? 0 : 200;
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

  const typed = valid(overrides.calorieTarget, 800, 6000) ? Math.round(overrides.calorieTarget) : null;
  // A typed target can't go under the safe minimum, or under maintenance when a deficit isn't advised
  const minimum = noDeficit && maintenance != null ? roundTo(maintenance, 25) : floor;
  const calories = typed != null ? Math.max(typed, minimum) : autoCalories;
  const protein = valid(overrides.proteinTarget, 20, 400) ? Math.round(overrides.proteinTarget) : autoProtein;
  const steps = valid(overrides.stepsGoal, 1000, 50000) ? Math.round(overrides.stepsGoal) : autoSteps;
  const waterLitres = valid(overrides.waterGoalLitres, 0.5, 8) ? overrides.waterGoalLitres : autoWater;

  // Expected weekly change from the calorie gap (7,700 kcal ~ 1 kg)
  const dailyGap = maintenance != null ? calories - maintenance : adjustment;
  const weeklyChangeKg = kgPerWeek(dailyGap);

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
    paceIsDefault,
    paceAvailable,
    habitFocus,
    allowedPaces,
  };
}
