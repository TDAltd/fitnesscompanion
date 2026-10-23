import { pgTable, integer, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bodyMeasurementsTable = pgTable("body_measurements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  neckCm: real("neck_cm"),
  chestCm: real("chest_cm"),
  waistCm: real("waist_cm"),
  hipsCm: real("hips_cm"),
  leftArmCm: real("left_arm_cm"),
  rightArmCm: real("right_arm_cm"),
  leftThighCm: real("left_thigh_cm"),
  rightThighCm: real("right_thigh_cm"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBodyMeasurementsSchema = createInsertSchema(bodyMeasurementsTable) .omit({ id: true, userId: true, createdAt: true });
export type InsertBodyMeasurements = z.infer<typeof insertBodyMeasurementsSchema>;
export type BodyMeasurement = typeof bodyMeasurementsTable.$inferSelect;
