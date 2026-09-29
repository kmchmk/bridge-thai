import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** Content-addressed audio cache: one row per unique (text, voice, provider). */
export const ttsCache = pgTable("tts_cache", {
  hash: text("hash").primaryKey(),
  text: text("text").notNull(),
  voice: text("voice").notNull(),
  provider: text("provider").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Last-used setup per learner (Clerk user id). */
export const learnerProfiles = pgTable("learner_profiles", {
  userId: text("user_id").primaryKey(),
  speakerGender: text("speaker_gender").notNull(),
  listenerGender: text("listener_gender").notNull(),
  relationship: text("relationship").notNull(),
  region: text("region").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sceneProgress = pgTable(
  "scene_progress",
  {
    userId: text("user_id").notNull(),
    sceneId: text("scene_id").notNull(),
    bestStars: integer("best_stars").notNull().default(0),
    completions: integer("completions").notNull().default(0),
    lastPlayedAt: timestamp("last_played_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.sceneId] })],
);
