ALTER TABLE "habit_logs" ADD COLUMN "treat_meal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "health_flags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "why" text;