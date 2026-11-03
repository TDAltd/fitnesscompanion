import { pgTable, serial, text, integer, timestamp, jsonb, boolean, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export type Audience = {
  /** all | active7 | inactive14 | new30 | goal */
  segment: string;
  goal?: string | null;
};

/** One marketing message, sent on any of email, phone notification and in-app. */
export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: boolean("email").notNull().default(false),
  push: boolean("push").notNull().default(false),
  inApp: boolean("in_app").notNull().default(false),
  audience: jsonb("audience").$type<Audience>().notNull().default({ segment: "all" }),
  subject: text("subject"),
  body: text("body").notNull().default(""),
  pushTitle: text("push_title"),
  pushBody: text("push_body"),
  buttonLabel: text("button_label"),
  /** An app page like /eat, or a full https:// address */
  buttonUrl: text("button_url"),
  /** draft | scheduled | sending | sent | cancelled */
  status: text("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  /** In-app card shows until this time */
  inAppUntil: timestamp("in_app_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Who a campaign went to, and what happened on each channel. */
export const campaignRecipientsTable = pgTable(
  "campaign_recipients",
  {
    campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    /** pending | sent | failed | skipped */
    emailStatus: text("email_status").notNull().default("skipped"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    /** pending | sent | none (no device) | failed | skipped */
    pushStatus: text("push_status").notNull().default("skipped"),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.userId] }), index("campaign_recipients_user_idx").on(t.userId)],
);
