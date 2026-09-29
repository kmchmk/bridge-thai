ALTER TABLE "scene_progress" ADD COLUMN "current_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "scene_progress" ADD COLUMN "current_mistakes" integer DEFAULT 0 NOT NULL;