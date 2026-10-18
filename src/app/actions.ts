"use server";

import { auth } from "@clerk/nextjs/server";
import { upsertCompletion } from "@/db/progress";
import { LOCATIONS } from "@/lib/atlas/catalog";

/** Auto-save on finishing a place: record stars and clear the in-progress marker. */
export async function completeScene(sceneId: unknown, mistakes: unknown) {
  // Server actions are public endpoints: accept only a known place and a sane mistake count.
  if (typeof sceneId !== "string" || !LOCATIONS.some((l) => l.id === sceneId))
    return { saved: false };
  const slips =
    typeof mistakes === "number" && Number.isFinite(mistakes)
      ? Math.min(99, Math.max(0, Math.floor(mistakes)))
      : 0;
  const { userId } = await auth();
  if (!userId) return { saved: false };
  await upsertCompletion(userId, sceneId, slips);
  return { saved: true };
}
