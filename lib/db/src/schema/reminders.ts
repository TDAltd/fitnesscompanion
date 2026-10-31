import { pgTable, serial, text, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/** A phone or browser that agreed to receive notifications. One person can have several. */
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  /** Short device label for the settings page, e.g. "iPhone" */
  device: text("device"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

/** Which reminders a person wants, and when their day starts and ends. */
export const reminderSettingsTable = pgTable("reminder_settings", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  water: boolean("water").notNull().default(true),
  workout: boolean("workout").notNull().default(true),
  meals: boolean("meals").notNull().default(true),
  weighIn: boolean("weigh_in").notNull().default(true),
  /** HH:MM local time. No reminders before wake or after bed. */
  wakeTime: text("wake_time").notNull().default("07:00"),
  bedTime: text("bed_time").notNull().default("22:00"),
  /** HH:MM; null = from the workout time preference in their profile */
  workoutTime: text("workout_time"),
  /** 0 = Sunday … 6 = Saturday */
  weighInDay: integer("weigh_in_day").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** What was sent, so a reminder goes out once even if the cron runs twice. */
export const remindersSentTable = pgTable(
  "reminders_sent",
  {
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // local YYYY-MM-DD
    kind: text("kind").notNull(), // "water-3", "workout", "lunch", "dinner", "weigh-in"
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date, t.kind] })],
);
