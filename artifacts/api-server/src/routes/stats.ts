import { Router } from "express";
import { db, weightLogsTable, workoutLogsTable, habitLogsTable, userProfileTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { uid } from "../lib/auth";

const router = Router();

router.get("/stats/summary", async (req, res) => {
  const userId = uid(req);
  const weights = await db
    .select()
    .from(weightLogsTable)
    .where(eq(weightLogsTable.userId, userId))
    .orderBy(desc(weightLogsTable.loggedAt));
  const [profile] = await db
    .select()
    .from(userProfileTable)
    .where(eq(userProfileTable.userId, userId))
    .limit(1);

  // Start = weight entered at onboarding, else the oldest log. Goal comes from the profile.
  const oldestLog = weights.length > 0 ? weights[weights.length - 1].weightKg : null;
  const START_WEIGHT = profile?.currentWeightKg ?? oldestLog ?? 0;
  const currentWeight = weights.length > 0 ? weights[0].weightKg : START_WEIGHT;
  const GOAL_WEIGHT = profile?.goalWeightKg ?? currentWeight;
  const weightLost = Math.max(0, START_WEIGHT - currentWeight);
  const totalToLose = START_WEIGHT - GOAL_WEIGHT;
  const percentToGoal =
    totalToLose > 0 ? Math.min(100, (weightLost / totalToLose) * 100) : 0;

  const workouts = await db.select().from(workoutLogsTable).where(eq(workoutLogsTable.userId, userId));
  const totalWorkouts = workouts.length;

  const allHabits = await db
    .select()
    .from(habitLogsTable)
    .where(eq(habitLogsTable.userId, userId))
    .orderBy(desc(habitLogsTable.date));

  const daysSinceStart =
    allHabits.length > 0
      ? Math.ceil(
          (Date.now() -
            new Date(allHabits[allHabits.length - 1].date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  const last7 = allHabits.slice(0, 7);
  const avgStepsLast7Days =
    last7.length > 0
      ? last7.reduce((sum, h) => sum + h.stepsDone, 0) / last7.length
      : null;
  const avgWaterLast7Days =
    last7.length > 0
      ? last7.reduce((sum, h) => sum + h.waterDoneLitres, 0) / last7.length
      : null;

  const compliantDays = last7.filter(
    (h) =>
      h.stepsDone >= h.stepsGoal &&
      h.waterDoneLitres >= h.waterGoalLitres &&
      h.biscuitsAvoided,
  ).length;
  const habitCompliancePercent =
    last7.length > 0 ? (compliantDays / last7.length) * 100 : null;

  res.json({
    startWeight: START_WEIGHT,
    currentWeight,
    goalWeight: GOAL_WEIGHT,
    weightLost: Math.round(weightLost * 10) / 10,
    percentToGoal: Math.round(percentToGoal * 10) / 10,
    totalWorkouts,
    daysSinceStart,
    avgStepsLast7Days: avgStepsLast7Days
      ? Math.round(avgStepsLast7Days)
      : null,
    avgWaterLast7Days: avgWaterLast7Days
      ? Math.round(avgWaterLast7Days * 10) / 10
      : null,
    habitCompliancePercent: habitCompliancePercent
      ? Math.round(habitCompliancePercent)
      : null,
  });
});

router.get("/stats/streak", async (req, res) => {
  const workouts = await db
    .select()
    .from(workoutLogsTable)
    .where(eq(workoutLogsTable.userId, uid(req)))
    .orderBy(desc(workoutLogsTable.loggedAt));

  const uniqueDates = [
    ...new Set(workouts.map((w) => w.loggedAt.toISOString().slice(0, 10))),
  ].sort((a, b) => b.localeCompare(a));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  if (uniqueDates.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    let expectedDate = today;
    let streakBroken = false;

    for (const date of uniqueDates) {
      if (!streakBroken && date === expectedDate) {
        currentStreak++;
        const prev = new Date(expectedDate);
        prev.setDate(prev.getDate() - 1);
        expectedDate = prev.toISOString().slice(0, 10);
      } else {
        streakBroken = true;
      }
    }

    let prevDate: string | null = null;
    for (const date of [...uniqueDates].reverse()) {
      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const prevDay: Date = new Date(prevDate as string);
        prevDay.setDate(prevDay.getDate() + 1);
        if (prevDay.toISOString().slice(0, 10) === date) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = date;
    }
  }

  res.json({
    currentStreak,
    longestStreak,
    totalDaysLogged: uniqueDates.length,
  });
});

export default router;
