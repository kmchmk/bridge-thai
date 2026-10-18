import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { starsFor } from "@/lib/game";

const t = schema.sceneProgress;
const target = [t.userId, t.sceneId];

/** Record a finished run: keep the best stars, count it, and clear the in-progress marker. */
export async function upsertCompletion(userId: string, sceneId: string, mistakes: number) {
  const stars = starsFor(mistakes);
  await getDb()
    .insert(t)
    .values({ userId, sceneId, bestStars: stars, completions: 1 })
    .onConflictDoUpdate({
      target,
      set: {
        bestStars: sql`greatest(${t.bestStars}, ${stars})`,
        completions: sql`${t.completions} + 1`,
        currentStep: 0,
        currentMistakes: 0,
        lastPlayedAt: new Date(),
      },
    });
}
