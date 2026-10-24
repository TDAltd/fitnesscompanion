import { pgTable, serial, text, integer, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** One row per user per day of data synced from Apple Health (via the iPhone Shortcut). */
export const healthDailyTable = pgTable(
  "health_daily",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD, the day the Shortcut ran for
    steps: integer("steps"),
    sleepMinutes: integer("sleep_minutes"),
    avgHeartRate: integer("avg_heart_rate"),
    activeEnergyKcal: integer("active_energy_kcal"),
    source: text("source").notNull().default("apple-health"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("health_daily_user_date_idx").on(t.userId, t.date)],
);

/** The user's private sync key for the iPhone Shortcut (stored hashed) and last sync info. */
export const healthSyncTable = pgTable("health_sync", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  /** What the Shortcut sent last time, kept for troubleshooting on the Connect page */
  lastPayload: text("last_payload"),
});

export type HealthDaily = typeof healthDailyTable.$inferSelect;
