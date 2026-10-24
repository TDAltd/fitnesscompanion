import { pgTable, serial, text, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  /** "user" or "admin" */
  role: text("role").notNull().default("user"),
  /** Set when an admin disables the account; the user can't log in until re-enabled */
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionsTable = pgTable("sessions", {
  // SHA-256 hash of the session token; the raw token only lives in the user's cookie
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;

/** One row per user per day they used the app (for active-user and retention numbers). */
export const activityDaysTable = pgTable(
  "activity_days",
  {
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD (UTC)
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

/** Feature-use events that aren't otherwise stored (e.g. AI meal estimates). */
export const usageEventsTable = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** App-wide switches an admin can change from the dashboard (e.g. "signups_open"). */
export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
