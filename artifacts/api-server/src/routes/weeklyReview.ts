import { Router } from "express";
import { and, between, desc, eq, gte, lt } from "drizzle-orm";
import {
  db,
  usersTable,
  userProfileTable,
  workoutLogsTable,
  weightLogsTable,
  mealPlanTable,
  healthDailyTable,
  habitLogsTable,
} from "@workspace/db";
import { avoidHabit, buildSchedule, calorieFloor } from "@workspace/plan";
import { targetsForUser } from "./planSettings";
import { TREAT_KCAL } from "./foodLog";
import { milestonesFor } from "../lib/milestones";
import { addDays, dateInTz, tzFor } from "../lib/dates";
import { uid } from "../lib/auth";

/**
 * Weekly review for the Progress page: Monday to Sunday (or to today for the current week),
 * compared with the same days of the week before, plus one focus for next week chosen by simple rules.
 */
const router = Router();

const weekday = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
export const mondayOf = (ymd: string) => addDays(ymd, -((weekday(ymd) + 6) % 7));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5) + 1;

type Period = {
  from: string;
  to: string;
  days: number;
  workouts: { done: number; planned: number };
  food: { days: number; onTarget: number | null; low: number };
  steps: { avg: number | null; goal: number; daysMet: number };
  water: { daysMet: number };
  habit: { label: string; days: number };
};

async function period(userId: number, from: string, to: string, tz: string): Promise<Period | null> {
  const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, userId));
  if (!profile) return null;
  const targets = await targetsForUser(userId);
  const days = daysBetween(from, to);
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));

  // Workouts by local day (a little wider in UTC, then filtered)
  const logs = await db
    .select({ at: workoutLogsTable.loggedAt })
    .from(workoutLogsTable)
    .where(and(eq(workoutLogsTable.userId, userId), gte(workoutLogsTable.loggedAt, new Date(`${addDays(from, -1)}T00:00:00Z`)), lt(workoutLogsTable.loggedAt, new Date(`${addDays(to, 2)}T00:00:00Z`))));
  const done = logs.filter((l) => {
    const d = dateInTz(l.at, tz);
    return d >= from && d <= to;
  }).length;
  const schedule = buildSchedule(profile);
  const planned = dates.filter((d) => !schedule[weekday(d)].rest).length;

  // Food: days logged, days within target (80% to target + 50, treat days get the allowance)
  const meals = await db
    .select({ date: mealPlanTable.date, kcal: mealPlanTable.calories })
    .from(mealPlanTable)
    .where(and(eq(mealPlanTable.userId, userId), between(mealPlanTable.date, from, to)));
  const kcalByDay = new Map<string, number>();
  for (const m of meals) kcalByDay.set(m.date, (kcalByDay.get(m.date) ?? 0) + m.kcal);
  const habits = await db.select().from(habitLogsTable).where(and(eq(habitLogsTable.userId, userId), between(habitLogsTable.date, from, to)));
  const treat = new Set(habits.filter((h) => h.treatMeal).map((h) => h.date));
  const floor = calorieFloor(profile.sex);
  let onTarget = 0;
  let low = 0;
  for (const [d, kcal] of kcalByDay) {
    const t = targets.calories + (treat.has(d) ? TREAT_KCAL : 0);
    if (kcal >= t * 0.8 && kcal <= t + 50) onTarget++;
    if (kcal < floor) low++;
  }

  // Steps: synced health data first, then what was typed on Today
  const health = await db
    .select({ date: healthDailyTable.date, steps: healthDailyTable.steps })
    .from(healthDailyTable)
    .where(and(eq(healthDailyTable.userId, userId), between(healthDailyTable.date, from, to)));
  const stepsByDay = new Map<string, number>();
  for (const h of habits) if (h.stepsDone > 0) stepsByDay.set(h.date, h.stepsDone);
  for (const h of health) if ((h.steps ?? 0) > 0) stepsByDay.set(h.date, h.steps!);
  const stepValues = [...stepsByDay.values()];

  return {
    from,
    to,
    days,
    workouts: { done, planned },
    food: { days: kcalByDay.size, onTarget: targets.habitFocus ? null : onTarget, low },
    steps: {
      avg: stepValues.length ? Math.round(stepValues.reduce((a, b) => a + b, 0) / stepValues.length) : null,
      goal: targets.steps,
      daysMet: stepValues.filter((s) => s >= targets.steps).length,
    },
    water: { daysMet: habits.filter((h) => h.waterDoneLitres >= (h.waterGoalLitres || targets.waterLitres)).length },
    habit: { label: avoidHabit(profile).label, days: habits.filter((h) => h.biscuitsAvoided).length },
  };
}

/** One thing to work on: the weakest habit this week, in plain words. */
function focusFor(p: Period, partial: boolean): string {
  const elapsed = Math.max(1, p.days);
  const scores: [string, number][] = [
    ["food", p.food.days / elapsed],
    ["water", p.water.daysMet / elapsed],
    ["habit", p.habit.days / elapsed],
  ];
  if (p.workouts.planned > 0) scores.push(["workouts", p.workouts.done / p.workouts.planned]);
  if (p.steps.avg != null) scores.push(["steps", p.steps.avg / p.steps.goal]);
  else scores.push(["steps", 0]);
  scores.sort((a, b) => a[1] - b[1]);
  const [weakest, score] = scores[0];
  const next = partial ? "For the rest of this week" : "Next week";
  if (score >= 0.8) return partial ? "You're on track so far. Keep the same rhythm." : "A strong week. Keep the same rhythm next week.";
  switch (weakest) {
    case "workouts":
      return `${p.workouts.done} of ${p.workouts.planned} workouts done. ${next}, put ${Math.min(p.workouts.planned, p.workouts.done + 1)} in your calendar now, like a meeting.`;
    case "food":
      return `Food was logged on ${p.food.days} of ${elapsed} days. ${next}, log at least one meal every day, even a rough one.`;
    case "steps":
      return p.steps.avg != null
        ? `Steps averaged ${p.steps.avg.toLocaleString("en-GB")} against ${p.steps.goal.toLocaleString("en-GB")}. A 15-minute walk after dinner adds about 1,500.`
        : `No steps recorded. ${next}, tick your steps on Today or connect your phone or watch.`;
    case "water":
      return `Water was the gap (${p.water.daysMet} of ${elapsed} days). Keep a bottle where you work and refill it twice.`;
    default:
      return `"${p.habit.label}" was ticked on ${p.habit.days} of ${elapsed} days. Keep it out of the house for a week, or plan one treat day instead.`;
  }
}

router.get("/weekly-review", async (req, res) => {
  const userId = uid(req);
  const tz = tzFor(req);
  const today = dateInTz(new Date(), tz);
  const thisMonday = mondayOf(today);
  const [user] = await db.select({ createdAt: usersTable.createdAt }).from(usersTable).where(eq(usersTable.id, userId));
  const joined = user ? dateInTz(user.createdAt, tz) : today;
  const firstMonday = mondayOf(joined);

  const asked = typeof req.query.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.week) ? mondayOf(req.query.week) : null;
  // Default: last week once a full week exists, else this week so far
  const start = asked ?? (firstMonday < thisMonday ? addDays(thisMonday, -7) : thisMonday);
  if (start > thisMonday || start < firstMonday) {
    res.status(400).json({ error: "No review for that week." });
    return;
  }
  const partial = start === thisMonday;
  const from = start < joined ? joined : start; // don't count days before joining
  const to = partial ? today : addDays(start, 6);
  const current = await period(userId, from, to, tz);
  if (!current) {
    res.status(404).json({ error: "Finish setting up first." });
    return;
  }
  // The same days of the week before, so a part week is compared fairly
  const prevStart = addDays(start, -7);
  const previous =
    prevStart >= firstMonday
      ? await period(userId, addDays(from, -7) < joined ? joined : addDays(from, -7), addDays(to, -7), tz)
      : null;

  // Weight: last weigh-in up to the end of the week vs the last one before it started
  const [profile] = await db.select({ healthFlags: userProfileTable.healthFlags }).from(userProfileTable).where(eq(userProfileTable.userId, userId));
  const habitFocus = (profile?.healthFlags ?? []).includes("eating-disorder");
  let weight: { start: number; end: number; change: number } | null = null;
  if (!habitFocus) {
    // By local day: the last weigh-in on or before the week's last day, vs the last one before it began
    const logs = await db
      .select()
      .from(weightLogsTable)
      .where(and(eq(weightLogsTable.userId, userId), lt(weightLogsTable.loggedAt, new Date(`${addDays(to, 2)}T00:00:00Z`))))
      .orderBy(desc(weightLogsTable.loggedAt));
    const local = logs.map((l) => ({ ...l, day: dateInTz(l.loggedAt, tz) }));
    const end = local.find((l) => l.day <= to);
    const before = local.find((l) => l.day < from);
    if (end && before && end.id !== before.id && end.day >= from) {
      weight = { start: before.weightKg, end: end.weightKg, change: Math.round((end.weightKg - before.weightKg) * 10) / 10 };
    }
  }

  const milestones = (await milestonesFor(userId))
    .filter((m) => m.earnedAt && !m.backfilled)
    .filter((m) => {
      const d = dateInTz(new Date(m.earnedAt!), tz);
      return d >= from && d <= to;
    })
    .map((m) => ({ icon: m.icon, title: m.title }));

  res.json({
    week: start,
    from,
    to,
    partial,
    habitFocus,
    canGoBack: addDays(start, -7) >= firstMonday,
    canGoForward: start < thisMonday,
    current,
    previous,
    weight,
    milestones,
    focus: focusFor(current, partial),
  });
});

export default router;
