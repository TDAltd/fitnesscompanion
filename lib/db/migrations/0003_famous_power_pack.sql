CREATE TABLE "activity_days" (
	"user_id" integer NOT NULL,
	"date" text NOT NULL,
	CONSTRAINT "activity_days_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_active_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity_days" ADD CONSTRAINT "activity_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill activity from what people have already logged, so active-user and retention numbers have history
INSERT INTO "activity_days" ("user_id", "date")
SELECT DISTINCT user_id, d FROM (
  SELECT id AS user_id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d FROM "users"
  UNION SELECT user_id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "sessions"
  UNION SELECT user_id, to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "weight_logs"
  UNION SELECT user_id, to_char(logged_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "workout_logs"
  UNION SELECT user_id, date FROM "habit_logs"
  UNION SELECT user_id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "meal_plan_entries"
  UNION SELECT user_id, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "body_measurements"
  UNION SELECT user_id, to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') FROM "health_daily"
) a
WHERE d IS NOT NULL AND d ~ '^\d{4}-\d{2}-\d{2}$'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "users" u SET "last_active_at" = sub.last
FROM (SELECT user_id, max(date)::timestamptz AS last FROM "activity_days" GROUP BY user_id) sub
WHERE sub.user_id = u.id;
