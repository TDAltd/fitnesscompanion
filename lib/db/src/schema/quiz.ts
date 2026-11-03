import { pgTable, text, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

/**
 * Which sign-up quiz screens each visitor reached. Anonymous: a random code per phone, no answers.
 * One row per visitor per screen (the first time they saw it).
 */
export const quizEventsTable = pgTable(
  "quiz_events",
  {
    visitorId: text("visitor_id").notNull(),
    step: text("step").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.visitorId, t.step] }), index("quiz_events_at_idx").on(t.at)],
);
