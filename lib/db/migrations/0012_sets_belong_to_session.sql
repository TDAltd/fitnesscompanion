ALTER TABLE "exercise_sets" ADD COLUMN "workout_id" integer;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_workout_id_workout_logs_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Link sets logged before this change to the session saved the same day (latest one that day)
UPDATE "exercise_sets" s SET "workout_id" = (
  SELECT w."id" FROM "workout_logs" w
  JOIN "users" u ON u."id" = w."user_id"
  WHERE w."user_id" = s."user_id"
    AND to_char(w."logged_at" AT TIME ZONE COALESCE(u."timezone", 'Africa/Lagos'), 'YYYY-MM-DD') = s."date"
    AND w."notes" LIKE '%sets logged%'
  ORDER BY w."logged_at" DESC LIMIT 1
) WHERE s."workout_id" IS NULL;
