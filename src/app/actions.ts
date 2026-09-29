"use server";

import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getScene } from "@/lib/content";
import { setupSchema } from "@/lib/setup";
import type { Setup } from "@/lib/register/types";
import { starsFor } from "@/lib/game";

export async function saveProfile(setup: Setup) {
  const { userId } = await auth();
  if (!userId) return { saved: false };
  const s = setupSchema.parse(setup);
  await getDb()
    .insert(schema.learnerProfiles)
    .values({ userId, ...s })
    .onConflictDoUpdate({ target: schema.learnerProfiles.userId, set: { ...s, updatedAt: new Date() } });
  return { saved: true };
}

export async function saveProgress(sceneId: string, mistakes: number) {
  const { userId } = await auth();
  if (!userId || !getScene(sceneId)) return { saved: false };
  const stars = starsFor(Math.max(0, Math.floor(mistakes)));
  await getDb()
    .insert(schema.sceneProgress)
    .values({ userId, sceneId, bestStars: stars, completions: 1 })
    .onConflictDoUpdate({
      target: [schema.sceneProgress.userId, schema.sceneProgress.sceneId],
      set: {
        bestStars: sql`greatest(${schema.sceneProgress.bestStars}, ${stars})`,
        completions: sql`${schema.sceneProgress.completions} + 1`,
        lastPlayedAt: new Date(),
      },
    });
  return { saved: true };
}
