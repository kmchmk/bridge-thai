ALTER TABLE "learner_profiles" ADD COLUMN "native" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "en_speaker_gender" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "en_listener_gender" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "en_formality" text;--> statement-breakpoint
ALTER TABLE "learner_profiles" ADD COLUMN "en_accent" text;