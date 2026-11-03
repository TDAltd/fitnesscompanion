CREATE TABLE "quiz_events" (
	"visitor_id" text NOT NULL,
	"step" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_events_visitor_id_step_pk" PRIMARY KEY("visitor_id","step")
);
--> statement-breakpoint
CREATE INDEX "quiz_events_at_idx" ON "quiz_events" USING btree ("at");