import { pgTable, serial, text, integer, real, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** One logged set of an exercise (weight x reps), for progressive overload on the Train page. */
export const exerciseSetsTable = pgTable(
  "exercise_sets",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD, user's local day
    exercise: text("exercise").notNull(),
    setNumber: integer("set_number").notNull(),
    weightKg: real("weight_kg"), // null = bodyweight
    reps: integer("reps").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("exercise_sets_user_ex_idx").on(t.userId, t.exercise, t.date)],
);
export type ExerciseSet = typeof exerciseSetsTable.$inferSelect;
