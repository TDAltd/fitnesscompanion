import { Router } from "express";
import { uid } from "../lib/auth";
import { targetsForUser } from "./planSettings";
import { db, habitLogsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { UpsertHabitBody } from "@workspace/api-zod";

const router = Router();

router.get("/habits", async (req, res) => {
  const logs = await db
    .select()
    .from(habitLogsTable)
    .where(eq(habitLogsTable.userId, uid(req)))
    .orderBy(desc(habitLogsTable.date));

  const formatted = logs.map((l) => ({
    id: l.id,
    date: l.date,
    stepsGoal: l.stepsGoal,
    stepsDone: l.stepsDone,
    waterGoalLitres: l.waterGoalLitres,
    waterDoneLitres: l.waterDoneLitres,
    biscuitsAvoided: l.biscuitsAvoided,
    caloriesConsumed: l.caloriesConsumed,
    proteinGrams: l.proteinGrams,
  }));
  res.json(formatted);
});

router.get("/habits/today", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [log] = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.date, today), eq(habitLogsTable.userId, uid(req))));

  const targets = await targetsForUser(uid(req));
  if (!log) {
    res.json({
      id: 0,
      date: today,
      stepsGoal: targets.steps,
      stepsDone: 0,
      waterGoalLitres: targets.waterLitres,
      waterDoneLitres: 0,
      biscuitsAvoided: false,
      caloriesConsumed: null,
      proteinGrams: null,
    });
    return;
  }

  // Today's goals always follow the current plan, even if targets changed since the row was created
  res.json({
    id: log.id,
    date: log.date,
    stepsGoal: targets.steps,
    stepsDone: log.stepsDone,
    waterGoalLitres: targets.waterLitres,
    waterDoneLitres: log.waterDoneLitres,
    biscuitsAvoided: log.biscuitsAvoided,
    caloriesConsumed: log.caloriesConsumed,
    proteinGrams: log.proteinGrams,
  });
});

router.post("/habits", async (req, res) => {
  const body = UpsertHabitBody.parse(req.body);
  const date = body.date;
  // Save the user's goals on the day's row so past days keep the goals that applied then
  const targets = await targetsForUser(uid(req));

  const [existing] = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.date, date), eq(habitLogsTable.userId, uid(req))));

  let log;
  if (existing) {
    const [updated] = await db
      .update(habitLogsTable)
      .set({
        stepsGoal: targets.steps,
        waterGoalLitres: targets.waterLitres,
        stepsDone: body.stepsDone ?? existing.stepsDone,
        waterDoneLitres: body.waterDoneLitres ?? existing.waterDoneLitres,
        biscuitsAvoided: body.biscuitsAvoided ?? existing.biscuitsAvoided,
        caloriesConsumed: body.caloriesConsumed ?? existing.caloriesConsumed,
        proteinGrams: body.proteinGrams ?? existing.proteinGrams,
      })
      .where(and(eq(habitLogsTable.date, date), eq(habitLogsTable.userId, uid(req))))
      .returning();
    log = updated;
  } else {
    const [inserted] = await db
      .insert(habitLogsTable)
      .values({
        userId: uid(req),
        date,
        stepsGoal: targets.steps,
        waterGoalLitres: targets.waterLitres,
        stepsDone: body.stepsDone ?? 0,
        waterDoneLitres: body.waterDoneLitres ?? 0,
        biscuitsAvoided: body.biscuitsAvoided ?? false,
        caloriesConsumed: body.caloriesConsumed,
        proteinGrams: body.proteinGrams,
      })
      .returning();
    log = inserted;
  }

  res.json({
    id: log.id,
    date: log.date,
    stepsGoal: log.stepsGoal,
    stepsDone: log.stepsDone,
    waterGoalLitres: log.waterGoalLitres,
    waterDoneLitres: log.waterDoneLitres,
    biscuitsAvoided: log.biscuitsAvoided,
    caloriesConsumed: log.caloriesConsumed,
    proteinGrams: log.proteinGrams,
  });
});

export default router;
