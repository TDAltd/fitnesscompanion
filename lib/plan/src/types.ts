/** The onboarding answers the plan is built from. Matches the profile returned by GET /api/profile. */
export interface PlanProfile {
  name?: string | null;
  ageYears?: number | null;
  sex?: string | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  goalWeightKg?: number | null;
  activityLevel?: string | null;
  fitnessGoal?: string | null;
  dietaryPreference?: string | null;
  guiltyPleasure?: string | null;
  workoutDaysPerWeek?: number | null;
  workoutLocation?: string | null;
  trainingExperience?: string | null;
  sleepHoursPerNight?: number | null;
  workoutTimePreference?: string | null;
  workoutDurationMinutes?: number | null;
}

/** Targets a user typed in themselves on the My plan page. null = use the automatic value. */
export interface TargetOverrides {
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  stepsGoal?: number | null;
  waterGoalLitres?: number | null;
  /** How fast to lose weight; only used when the goal is to lose weight */
  pace?: Pace | null;
}

export type Pace = "gentle" | "steady" | "faster";

export interface Targets {
  calories: number;
  protein: number;
  steps: number;
  waterLitres: number;
  /** Estimated maintenance calories, null when the profile is missing body data */
  maintenance: number | null;
  /** Expected weight change per week at the calorie target (negative = loss) */
  weeklyChangeKg: number;
  /** What the app would suggest without overrides */
  auto: { calories: number; protein: number; steps: number; waterLitres: number };
  overridden: { calories: boolean; protein: boolean; steps: boolean; waterLitres: boolean };
  notes: string[];
  /** The weight-loss pace in use, or null when the goal isn't weight loss (or a deficit isn't advised) */
  pace: Pace | null;
  /** True when the person can choose a pace (losing weight, adult, not underweight) */
  paceAvailable: boolean;
}

export type SessionType = "FULL" | "LOWER" | "UPPER" | "CORE" | "CARDIO" | "INTERVALS" | "LONG";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  url: string;
}

export interface Session {
  id: SessionType;
  title: string;
  focus: string;
  /** e.g. "Mon & Thu · Evening · 45 min" */
  when: string;
  days: number[];
  durationMinutes: number;
  exercises: Exercise[];
  note?: string;
}

export interface ScheduleDay {
  day: number; // 0 = Sunday
  label: string;
  rest: boolean;
  sessionId: SessionType | null;
  workout: string;
}

export interface Guideline {
  id: string;
  title: string;
  description: string;
  details: string[];
}

export interface Plan {
  targets: Targets;
  schedule: ScheduleDay[];
  sessions: Session[];
  guidelines: Guideline[];
  /** Label for the daily "avoid my guilty pleasure" habit */
  avoidHabit: { label: string; short: string };
}
