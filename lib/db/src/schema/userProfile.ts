import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfileTable = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name"),
  ageYears: integer("age_years"),
  heightCm: real("height_cm"),
  currentWeightKg: real("current_weight_kg"),
  goalWeightKg: real("goal_weight_kg"),
  sex: text("sex"),
  activityLevel: text("activity_level"),
  fitnessGoal: text("fitness_goal"),
  dietaryPreference: text("dietary_preference"),
  guiltyPleasure: text("guilty_pleasure"),
  workoutDaysPerWeek: integer("workout_days_per_week"),
  workoutLocation: text("workout_location"),
  trainingExperience: text("training_experience"),
  sleepHoursPerNight: real("sleep_hours_per_night"),
  mealSchedule: text("meal_schedule"),
  waterIntakeLiters: real("water_intake_liters"),
  dailySchedule: text("daily_schedule"),
  workoutTimePreference: text("workout_time_preference"),
  workoutDurationMinutes: integer("workout_duration_minutes"),
  // Targets the user set by hand on the My plan page (null = use the automatic value)
  calorieTarget: integer("calorie_target"),
  proteinTarget: integer("protein_target"),
  stepsGoal: integer("steps_goal"),
  waterGoalLitres: real("water_goal_litres"),
  /** Weight-loss pace: "gentle" | "steady" | "faster" (null = the app's default) */
  pace: text("pace"),
  /** Screening answers that change the plan: pregnant, breastfeeding, diabetes, eating-disorder */
  healthFlags: text("health_flags").array().notNull().default([]),
  /** The person's own reason, shown back on hard days */
  why: text("why"),
  /** Home workout kit (see EQUIPMENT in @workspace/plan) */
  equipment: text("equipment").array().notNull().default([]),
  /** YYYY-MM-DD. Age is worked out from this when present */
  dateOfBirth: text("date_of_birth"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfileTable) .omit({ id: true, userId: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfileTable.$inferSelect;
