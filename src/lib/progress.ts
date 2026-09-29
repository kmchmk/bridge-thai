import "server-only";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export interface SceneProgress {
  sceneId: string;
  bestStars: number;
  completions: number;
  currentStep: number;
  currentMistakes: number;
  lastPlayedAt: Date;
}

/** The signed-in learner's progress rows, newest first. Empty when signed out or the DB is unreachable. */
export async function getMyProgress(): Promise<{ signedIn: boolean; rows: SceneProgress[] }> {
  try {
    const { userId } = await auth();
    if (!userId) return { signedIn: false, rows: [] };
    const rows = await getDb()
      .select()
      .from(schema.sceneProgress)
      .where(eq(schema.sceneProgress.userId, userId))
      .orderBy(desc(schema.sceneProgress.lastPlayedAt));
    return { signedIn: true, rows };
  } catch {
    return { signedIn: false, rows: [] };
  }
}
