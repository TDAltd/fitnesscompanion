import { Router } from "express";
import { uid } from "../lib/auth";
import { db, userProfileTable, weightLogsTable } from "@workspace/db";
import { UpsertProfileBody } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { ageFromBirthDate } from "@workspace/plan";
import { todayFor } from "../lib/dates";

const router = Router();

router.get("/profile", async (req, res) => {
  let [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, uid(req))).limit(1);
  // Birthdays move the age on by itself
  const age = profile ? ageFromBirthDate(profile.dateOfBirth, todayFor(req)) : null;
  if (profile && age != null && age !== profile.ageYears) {
    [profile] = await db.update(userProfileTable).set({ ageYears: age }).where(eq(userProfileTable.id, profile.id)).returning();
  }

  if (!profile) {
    res.json({
      id: 0,
      name: null,
      ageYears: null,
      heightCm: null,
      currentWeightKg: null,
      goalWeightKg: null,
      sex: null,
      activityLevel: null,
      fitnessGoal: null,
      dietaryPreference: null,
      guiltyPleasure: null,
      workoutDaysPerWeek: null,
      workoutLocation: null,
      trainingExperience: null,
      sleepHoursPerNight: null,
      mealSchedule: null,
      waterIntakeLiters: null,
      dailySchedule: null,
      workoutTimePreference: null,
      workoutDurationMinutes: null,
      healthFlags: [],
      why: null,
      equipment: [],
      dateOfBirth: null,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json({
    id: profile.id,
    name: profile.name,
    ageYears: profile.ageYears,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    sex: profile.sex,
    activityLevel: profile.activityLevel,
    fitnessGoal: profile.fitnessGoal,
    dietaryPreference: profile.dietaryPreference,
    guiltyPleasure: profile.guiltyPleasure,
    workoutDaysPerWeek: profile.workoutDaysPerWeek,
    workoutLocation: profile.workoutLocation,
    trainingExperience: profile.trainingExperience,
    sleepHoursPerNight: profile.sleepHoursPerNight,
    mealSchedule: profile.mealSchedule,
    waterIntakeLiters: profile.waterIntakeLiters,
    dailySchedule: profile.dailySchedule,
    workoutTimePreference: profile.workoutTimePreference,
    workoutDurationMinutes: profile.workoutDurationMinutes,
    healthFlags: profile.healthFlags,
    why: profile.why,
    equipment: profile.equipment,
    dateOfBirth: profile.dateOfBirth,
    updatedAt: profile.updatedAt.toISOString(),
  });
});

router.post("/profile", async (req, res) => {
  const body = UpsertProfileBody.parse(req.body);
  // A birth date sets the age (and keeps it right every year)
  if (body.dateOfBirth) {
    const age = ageFromBirthDate(body.dateOfBirth, todayFor(req));
    if (age == null || age < 13 || age > 110) {
      res.status(400).json({ error: "Check your date of birth." });
      return;
    }
    body.ageYears = age;
  }

  const [existing] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, uid(req))).limit(1);

  let profile;
  if (existing) {
    const [updated] = await db
      .update(userProfileTable)
      .set({
        name: body.name ?? existing.name,
        ageYears: body.ageYears ?? existing.ageYears,
        heightCm: body.heightCm ?? existing.heightCm,
        currentWeightKg: body.currentWeightKg ?? existing.currentWeightKg,
        goalWeightKg: body.goalWeightKg ?? existing.goalWeightKg,
        sex: body.sex ?? existing.sex,
        activityLevel: body.activityLevel ?? existing.activityLevel,
        fitnessGoal: body.fitnessGoal ?? existing.fitnessGoal,
        dietaryPreference: body.dietaryPreference ?? existing.dietaryPreference,
        guiltyPleasure: body.guiltyPleasure !== undefined ? body.guiltyPleasure : existing.guiltyPleasure,
        workoutDaysPerWeek: body.workoutDaysPerWeek ?? existing.workoutDaysPerWeek,
        workoutLocation: body.workoutLocation ?? existing.workoutLocation,
        trainingExperience: body.trainingExperience ?? existing.trainingExperience,
        sleepHoursPerNight: body.sleepHoursPerNight !== undefined ? body.sleepHoursPerNight : existing.sleepHoursPerNight,
        mealSchedule: body.mealSchedule !== undefined ? body.mealSchedule : existing.mealSchedule,
        waterIntakeLiters: body.waterIntakeLiters !== undefined ? body.waterIntakeLiters : existing.waterIntakeLiters,
        dailySchedule: body.dailySchedule !== undefined ? body.dailySchedule : existing.dailySchedule,
        workoutTimePreference: body.workoutTimePreference !== undefined ? body.workoutTimePreference : existing.workoutTimePreference,
        workoutDurationMinutes: body.workoutDurationMinutes !== undefined ? body.workoutDurationMinutes : existing.workoutDurationMinutes,
        healthFlags: body.healthFlags !== undefined ? [...new Set(body.healthFlags)] : existing.healthFlags,
        why: body.why !== undefined ? (body.why?.trim().slice(0, 200) || null) : existing.why,
        equipment: body.equipment !== undefined ? [...new Set(body.equipment)] : existing.equipment,
        dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth : existing.dateOfBirth,
        updatedAt: new Date(),
      })
      .where(eq(userProfileTable.userId, uid(req)))
      .returning();
    profile = updated;
  } else {
    const [inserted] = await db
      .insert(userProfileTable)
      .values({
        userId: uid(req),
        name: body.name,
        ageYears: body.ageYears,
        heightCm: body.heightCm,
        currentWeightKg: body.currentWeightKg,
        goalWeightKg: body.goalWeightKg,
        sex: body.sex,
        activityLevel: body.activityLevel,
        fitnessGoal: body.fitnessGoal,
        dietaryPreference: body.dietaryPreference,
        guiltyPleasure: body.guiltyPleasure ?? null,
        workoutDaysPerWeek: body.workoutDaysPerWeek,
        workoutLocation: body.workoutLocation,
        trainingExperience: body.trainingExperience,
        sleepHoursPerNight: body.sleepHoursPerNight ?? null,
        mealSchedule: body.mealSchedule ?? null,
        waterIntakeLiters: body.waterIntakeLiters ?? null,
        dailySchedule: body.dailySchedule ?? null,
        workoutTimePreference: body.workoutTimePreference ?? null,
        workoutDurationMinutes: body.workoutDurationMinutes ?? null,
        healthFlags: [...new Set(body.healthFlags ?? [])],
        why: body.why?.trim().slice(0, 200) || null,
        equipment: [...new Set(body.equipment ?? [])],
        dateOfBirth: body.dateOfBirth ?? null,
        updatedAt: new Date(),
      })
      .returning();
    profile = inserted;
  }
  {
    // One weight history: the weight in your answers becomes a weigh-in when it's new or changed
    const weight = body.currentWeightKg;
    if (weight != null) {
      const [latest] = await db
        .select()
        .from(weightLogsTable)
        .where(eq(weightLogsTable.userId, uid(req)))
        .orderBy(desc(weightLogsTable.loggedAt))
        .limit(1);
      if (!latest || Math.abs(latest.weightKg - weight) >= 0.05) {
        await db.insert(weightLogsTable).values({ userId: uid(req), weightKg: weight, notes: latest ? "From updated answers" : "Starting weight" });
      }
    }
  }

  res.json({
    id: profile.id,
    name: profile.name,
    ageYears: profile.ageYears,
    heightCm: profile.heightCm,
    currentWeightKg: profile.currentWeightKg,
    goalWeightKg: profile.goalWeightKg,
    sex: profile.sex,
    activityLevel: profile.activityLevel,
    fitnessGoal: profile.fitnessGoal,
    dietaryPreference: profile.dietaryPreference,
    guiltyPleasure: profile.guiltyPleasure,
    workoutDaysPerWeek: profile.workoutDaysPerWeek,
    workoutLocation: profile.workoutLocation,
    trainingExperience: profile.trainingExperience,
    sleepHoursPerNight: profile.sleepHoursPerNight,
    mealSchedule: profile.mealSchedule,
    waterIntakeLiters: profile.waterIntakeLiters,
    dailySchedule: profile.dailySchedule,
    workoutTimePreference: profile.workoutTimePreference,
    workoutDurationMinutes: profile.workoutDurationMinutes,
    healthFlags: profile.healthFlags,
    why: profile.why,
    equipment: profile.equipment,
    dateOfBirth: profile.dateOfBirth,
    updatedAt: profile.updatedAt.toISOString(),
  });
});

export default router;
