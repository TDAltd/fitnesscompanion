import { Router } from "express";
import { uid } from "../lib/auth";
import { db, userProfileTable } from "@workspace/db";
import { UpsertProfileBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/profile", async (req, res) => {
  const [profile] = await db.select().from(userProfileTable).where(eq(userProfileTable.userId, uid(req))).limit(1);

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
    updatedAt: profile.updatedAt.toISOString(),
  });
});

router.post("/profile", async (req, res) => {
  const body = UpsertProfileBody.parse(req.body);

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
        updatedAt: new Date(),
      })
      .returning();
    profile = inserted;
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
    updatedAt: profile.updatedAt.toISOString(),
  });
});

export default router;
