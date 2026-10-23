import { uniqueIndex, pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habitLogsTable = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  stepsGoal: integer("steps_goal").notNull().default(10000),
  stepsDone: integer("steps_done").notNull().default(0),
  waterGoalLitres: real("water_goal_litres").notNull().default(2.5),
  waterDoneLitres: real("water_done_litres").notNull().default(0),
  biscuitsAvoided: boolean("biscuits_avoided").notNull().default(false),
  caloriesConsumed: integer("calories_consumed"),
  proteinGrams: integer("protein_grams"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("habit_logs_user_date_idx").on(t.userId, t.date)]);

export const insertHabitLogSchema = createInsertSchema(habitLogsTable) .omit({ id: true, userId: true, createdAt: true });
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;
export type HabitLog = typeof habitLogsTable.$inferSelect;
