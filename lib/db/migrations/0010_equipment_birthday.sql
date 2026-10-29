ALTER TABLE "user_profile" ADD COLUMN "equipment" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "date_of_birth" text;