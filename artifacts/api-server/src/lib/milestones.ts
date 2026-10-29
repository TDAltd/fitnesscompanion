import { and, asc, eq, sql } from "drizzle-orm";
import {
  db,
  activityDaysTable,
  bodyMeasurementsTable,
  exerciseSetsTable,
  mealPlanTable,
  milestonesTable,
  userProfileTable,
  usersTable,
  weightLogsTable,
  workoutLogsTable,
} from "@workspace/db";
import { calorieFloor } from "@workspace/plan";
import { DEFAULT_TZ, dateInTz, validTimezone } from "./dates";

/**
 * Milestones: one source of truth, worked out from the database.
 * Rules that matter:
 *  - Nothing rewards eating very little: a day only counts as "logged" at or above the safe minimum.
 *  - Totals, not streaks: "30 days logged" never resets.
 *  - Once earned, always earned (stored in the milestones table).
 */
export type Group = "habit" | "training" | "body" | "loyalty";

export interface MilestoneDef {
  key: string;
  group: Group;
  title: string;
  /** One line for the pop-up and the share card */
  line: string;
  /** Emoji used on the share card and pop-up */
  icon: string;
  current: number;
  target: number;
  unit: string;
}

export interface MilestoneView extends Omit<MilestoneDef, "current" | "target"> {
  earned: boolean;
  earnedAt: string | null;
  seen: boolean;
  /** Already reached when milestones first switched on for this person (no pop-up, not in emails) */
  backfilled: boolean;
  progress: { current: number; target: number };
}

const weekStart = (ymd: string) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);
const round1 = (n: number) => Math.round(n * 10) / 10;

async function stats(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const tz = validTimezone(user?.timezone) ? user!.timezone! : DEFAULT_TZ;
  const today = dateInTz(new Date(), tz);
  const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, userId));
  const floor = calorieFloor(profile?.sex);

  const meals = await db
    .select({ date: mealPlanTable.date, kcal: sql<number>`sum(${mealPlanTable.calories})::int`, n: sql<number>`count(*)::int` })
    .from(mealPlanTable)
    .where(eq(mealPlanTable.userId, userId))
    .groupBy(mealPlanTable.date);
  const workouts = await db.select({ at: workoutLogsTable.loggedAt }).from(workoutLogsTable).where(eq(workoutLogsTable.userId, userId));
  const weights = await db
    .select({ kg: weightLogsTable.weightKg, at: weightLogsTable.loggedAt })
    .from(weightLogsTable)
    .where(eq(weightLogsTable.userId, userId))
    .orderBy(asc(weightLogsTable.loggedAt));
  const waists = await db
    .select({ date: bodyMeasurementsTable.date, waist: bodyMeasurementsTable.waistCm })
    .from(bodyMeasurementsTable)
    .where(and(eq(bodyMeasurementsTable.userId, userId), sql`${bodyMeasurementsTable.waistCm} is not null`))
    .orderBy(asc(bodyMeasurementsTable.date));
  const activity = (
    await db.select({ date: activityDaysTable.date }).from(activityDaysTable).where(eq(activityDaysTable.userId, userId)).orderBy(asc(activityDaysTable.date))
  ).map((r) => r.date);
  const sets = await db
    .select({ exercise: exerciseSetsTable.exercise, date: exerciseSetsTable.date, top: sql<number | null>`max(${exerciseSetsTable.weightKg})` })
    .from(exerciseSetsTable)
    .where(eq(exerciseSetsTable.userId, userId))
    .groupBy(exerciseSetsTable.exercise, exerciseSetsTable.date)
    .orderBy(asc(exerciseSetsTable.date));

  // Personal bests: a later session's top weight beats every earlier one for that exercise
  const best = new Map<string, number>();
  let personalBests = 0;
  for (const s of sets) {
    if (s.top == null) continue;
    const prev = best.get(s.exercise);
    if (prev != null && s.top > prev) personalBests++;
    best.set(s.exercise, Math.max(prev ?? 0, s.top));
  }

  // Full planned weeks: Monday–Sunday weeks with at least the planned number of workouts
  const planned = profile?.workoutDaysPerWeek ?? 3;
  const perWeek = new Map<string, number>();
  for (const w of workouts) {
    const wk = weekStart(dateInTz(w.at, tz));
    perWeek.set(wk, (perWeek.get(wk) ?? 0) + 1);
  }
  const fullWeeks = [...perWeek.values()].filter((n) => n >= planned).length;

  // Weekly weigh-ins in a row (longest run of consecutive weeks with one)
  const weighWeeks = [...new Set(weights.map((w) => weekStart(dateInTz(w.at, tz))))].sort();
  let run = 0;
  let bestRun = 0;
  for (let i = 0; i < weighWeeks.length; i++) {
    run = i > 0 && daysBetween(weighWeeks[i - 1], weighWeeks[i]) === 7 ? run + 1 : 1;
    bestRun = Math.max(bestRun, run);
  }

  // Comeback: used the app again after 7+ days away
  let comebacks = 0;
  for (let i = 1; i < activity.length; i++) if (daysBetween(activity[i - 1], activity[i]) >= 7) comebacks++;

  const start = weights[0]?.kg ?? profile?.currentWeightKg ?? null;
  const latest = weights.at(-1)?.kg ?? start;
  const goal = profile?.goalWeightKg ?? null;

  return {
    mealsLogged: meals.reduce((t, m) => t + m.n, 0),
    loggedDays: meals.filter((m) => m.kcal >= floor).length,
    workouts: workouts.length,
    fullWeeks,
    personalBests,
    weighIns: Math.max(0, weights.length - 1), // the first is the starting weight from setup
    weighInWeeksInARow: bestRun,
    start,
    latest,
    goal,
    lost: start != null && latest != null ? round1(start - latest) : 0,
    waistDown: waists.length > 1 && waists[0].waist != null && waists.at(-1)!.waist != null ? round1(waists[0].waist - waists.at(-1)!.waist!) : 0,
    memberDays: user ? daysBetween(dateInTz(user.createdAt, tz), today) : 0,
    comebacks,
  };
}

function definitions(s: Awaited<ReturnType<typeof stats>>): MilestoneDef[] {
  const defs: MilestoneDef[] = [];
  const add = (d: MilestoneDef) => defs.push(d);

  // Habit
  add({ key: "first-meal", group: "habit", title: "First meal logged", line: "The first step: you logged your first meal.", icon: "🍽️", current: s.mealsLogged, target: 1, unit: "meal" });
  add({ key: "first-weigh-in", group: "habit", title: "First weigh-in", line: "You checked in with the scale. Now we can see your trend.", icon: "⚖️", current: s.weighIns, target: 1, unit: "weigh-in" });
  for (const n of [3, 7, 14, 30, 60, 100, 200, 365])
    add({ key: `days-logged-${n}`, group: "habit", title: `${n} days logged`, line: `${n} days of food logged. Knowing what you eat is half the work.`, icon: "📒", current: s.loggedDays, target: n, unit: "days" });

  // Training
  add({ key: "first-workout", group: "training", title: "First workout", line: "Your first workout is done. The hardest one.", icon: "💪", current: s.workouts, target: 1, unit: "workout" });
  for (const n of [5, 10, 25, 50, 100, 200])
    add({ key: `workouts-${n}`, group: "training", title: `${n} workouts`, line: `${n} workouts done. This is becoming who you are.`, icon: "🏋️", current: s.workouts, target: n, unit: "workouts" });
  add({ key: "full-week-1", group: "training", title: "First full week", line: "Every planned workout in one week. That's a complete week.", icon: "📅", current: s.fullWeeks, target: 1, unit: "weeks" });
  for (const n of [4, 12])
    add({ key: `full-week-${n}`, group: "training", title: `${n} full weeks`, line: `${n} weeks with every planned workout done.`, icon: "📅", current: s.fullWeeks, target: n, unit: "weeks" });
  add({ key: "personal-best-1", group: "training", title: "First personal best", line: "You lifted heavier than ever before. Stronger already.", icon: "🏆", current: s.personalBests, target: 1, unit: "personal bests" });
  add({ key: "personal-best-10", group: "training", title: "10 personal bests", line: "Ten times you beat your own best.", icon: "🏆", current: s.personalBests, target: 10, unit: "personal bests" });

  // Body (only for people with weight to lose, and never counting gains)
  const toLose = s.start != null && s.goal != null ? round1(s.start - s.goal) : null;
  if (toLose != null && toLose > 0) {
    for (let kg = 2; kg <= Math.min(40, Math.ceil(toLose)); kg += 2)
      add({ key: `lost-${kg}kg`, group: "body", title: `${kg} kg down`, line: `${kg} kg lighter than when you started.`, icon: "📉", current: Math.max(0, s.lost), target: kg, unit: "kg" });
    if (toLose >= 4)
      add({ key: "halfway", group: "body", title: "Halfway there", line: "Halfway to your goal weight. Keep going.", icon: "⛰️", current: Math.max(0, s.lost), target: round1(toLose / 2), unit: "kg" });
    add({ key: "goal-reached", group: "body", title: "Goal reached", line: "You reached your goal weight. Incredible work.", icon: "🎯", current: Math.max(0, s.lost), target: toLose, unit: "kg" });
  }
  for (const cm of [2, 5, 10])
    add({ key: `waist-${cm}cm`, group: "body", title: `${cm} cm off your waist`, line: `Your waist is ${cm} cm smaller. The tape doesn't lie.`, icon: "📏", current: Math.max(0, s.waistDown), target: cm, unit: "cm" });

  // Loyalty
  for (const [days, label] of [[30, "1 month"], [90, "3 months"], [182, "6 months"], [365, "1 year"]] as const)
    add({ key: `member-${days}`, group: "loyalty", title: `${label} with us`, line: `${label} of looking after yourself with Fitness Companion.`, icon: "🌱", current: s.memberDays, target: days, unit: "days" });
  add({ key: "comeback", group: "loyalty", title: "Welcome back", line: "You came back after a break. That's what counts.", icon: "🔁", current: s.comebacks, target: 1, unit: "returns" });
  add({ key: "check-ins-4", group: "loyalty", title: "4 weekly check-ins", line: "Four weeks in a row of weighing in.", icon: "✅", current: s.weighInWeeksInARow, target: 4, unit: "weeks" });
  add({ key: "check-ins-12", group: "loyalty", title: "12 weekly check-ins", line: "Twelve weeks in a row of weighing in.", icon: "✅", current: s.weighInWeeksInARow, target: 12, unit: "weeks" });
  return defs;
}

/**
 * Works out milestones, saves any newly earned ones, and returns the full list.
 * The very first time for a person, everything already reached is saved as seen,
 * so existing users don't get a flood of pop-ups.
 */
export async function milestonesFor(userId: number): Promise<MilestoneView[]> {
  const defs = definitions(await stats(userId));
  const saved = await db.select().from(milestonesTable).where(eq(milestonesTable.userId, userId));
  // "_init" marks that milestones have been worked out for this person before
  const firstRun = !saved.some((r) => r.key === "_init");
  const savedByKey = new Map(saved.map((r) => [r.key, r]));
  const now = new Date();
  if (firstRun) await db.insert(milestonesTable).values({ userId, key: "_init", earnedAt: now, seenAt: now }).onConflictDoNothing();
  const fresh = defs.filter((d) => d.current >= d.target && !savedByKey.has(d.key));
  if (fresh.length) {
    const rows = await db
      .insert(milestonesTable)
      .values(fresh.map((d) => ({ userId, key: d.key, earnedAt: now, seenAt: firstRun ? now : null })))
      .onConflictDoNothing()
      .returning();
    for (const r of rows) savedByKey.set(r.key, r);
  }
  return defs.map((d) => {
    const row = savedByKey.get(d.key);
    const { current, target, ...rest } = d;
    return {
      ...rest,
      earned: Boolean(row),
      earnedAt: row?.earnedAt.toISOString() ?? null,
      seen: Boolean(row?.seenAt),
      backfilled: Boolean(row?.seenAt && row.seenAt.getTime() === row.earnedAt.getTime()),
      progress: { current: Math.min(current, target), target },
    };
  });
}
