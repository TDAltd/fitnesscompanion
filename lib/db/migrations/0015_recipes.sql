CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Lunch' NOT NULL,
	"cuisine" text DEFAULT 'Nigerian' NOT NULL,
	"prep_mins" integer,
	"calories" integer NOT NULL,
	"protein" integer DEFAULT 0 NOT NULL,
	"carbs" integer DEFAULT 0 NOT NULL,
	"fat" integer DEFAULT 0 NOT NULL,
	"ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"photo" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
