import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * Problems people hit, grouped: the same error on the same page is one row with a count.
 * source: "app" (in the phone/browser), "server", or "health-sync" (a Shortcut sync that was refused).
 */
export const errorEventsTable = pgTable("error_events", {
  id: serial("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  source: text("source").notNull(),
  message: text("message").notNull(),
  detail: text("detail"),
  page: text("page"),
  userAgent: text("user_agent"),
  count: integer("count").notNull().default(1),
  /** Distinct user ids seen (capped), to show how many people it affects */
  userIds: jsonb("user_ids").$type<number[]>().notNull().default([]),
  firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  /** Set when marked fixed; cleared if it happens again */
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  /** When it was last included in the daily email */
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
});
