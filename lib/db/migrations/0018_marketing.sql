CREATE TABLE "campaign_recipients" (
	"campaign_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"email_status" text DEFAULT 'skipped' NOT NULL,
	"email_sent_at" timestamp with time zone,
	"push_status" text DEFAULT 'skipped' NOT NULL,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"seen_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	CONSTRAINT "campaign_recipients_campaign_id_user_id_pk" PRIMARY KEY("campaign_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"push" boolean DEFAULT false NOT NULL,
	"in_app" boolean DEFAULT false NOT NULL,
	"audience" jsonb DEFAULT '{"segment":"all"}'::jsonb NOT NULL,
	"subject" text,
	"body" text DEFAULT '' NOT NULL,
	"push_title" text,
	"push_body" text,
	"button_label" text,
	"button_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"in_app_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "marketing" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_recipients_user_idx" ON "campaign_recipients" USING btree ("user_id");