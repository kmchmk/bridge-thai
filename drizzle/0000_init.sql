CREATE TABLE "learner_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"speaker_gender" text NOT NULL,
	"listener_gender" text NOT NULL,
	"relationship" text NOT NULL,
	"region" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scene_progress" (
	"user_id" text NOT NULL,
	"scene_id" text NOT NULL,
	"best_stars" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scene_progress_user_id_scene_id_pk" PRIMARY KEY("user_id","scene_id")
);
--> statement-breakpoint
CREATE TABLE "tts_cache" (
	"hash" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"voice" text NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
