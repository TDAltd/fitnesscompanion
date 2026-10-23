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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfileTable) .omit({ id: true, userId: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfileTable.$inferSelect;
