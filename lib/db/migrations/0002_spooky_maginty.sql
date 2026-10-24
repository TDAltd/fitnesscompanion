CREATE TABLE "health_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" text NOT NULL,
	"steps" integer,
	"sleep_minutes" integer,
	"avg_heart_rate" integer,
	"active_energy_kcal" integer,
	"source" text DEFAULT 'apple-health' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_sync" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_payload" text,
	CONSTRAINT "health_sync_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "health_daily" ADD CONSTRAINT "health_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_sync" ADD CONSTRAINT "health_sync_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "health_daily_user_date_idx" ON "health_daily" USING btree ("user_id","date");