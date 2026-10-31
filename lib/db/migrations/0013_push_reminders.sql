CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sent_at" timestamp with time zone,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reminder_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"water" boolean DEFAULT true NOT NULL,
	"workout" boolean DEFAULT true NOT NULL,
	"meals" boolean DEFAULT true NOT NULL,
	"weigh_in" boolean DEFAULT true NOT NULL,
	"wake_time" text DEFAULT '07:00' NOT NULL,
	"bed_time" text DEFAULT '22:00' NOT NULL,
	"workout_time" text,
	"weigh_in_day" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders_sent" (
	"user_id" integer NOT NULL,
	"date" text NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_sent_user_id_date_kind_pk" PRIMARY KEY("user_id","date","kind")
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_settings" ADD CONSTRAINT "reminder_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders_sent" ADD CONSTRAINT "reminders_sent_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;