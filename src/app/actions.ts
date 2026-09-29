"use server";

import { auth } from "@clerk/nextjs/server";
import { getDb, schema } from "@/db";
import { upsertCompletion, upsertStep } from "@/db/progress";
import { getScene } from "@/lib/content";
import { setupSchema } from "@/lib/setup";
import type { Setup } from "@/lib/register/types";

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

/** Auto-save after each correct answer: remember where the learner is and how many slips so far. */
export async function saveStep(sceneId: string, step: number, mistakes: number) {
  const { userId } = await auth();
  const scene = getScene(sceneId);
  if (!userId || !scene) return { saved: false };
  const currentStep = Math.min(Math.max(0, Math.floor(step)), scene.steps.length - 1);
  await upsertStep(userId, sceneId, currentStep, Math.max(0, Math.floor(mistakes)));
  return { saved: true };
}

/** Auto-save on finishing a scene: record stars and clear the in-progress marker. */
export async function completeScene(sceneId: string, mistakes: number) {
  const { userId } = await auth();
  if (!userId || !getScene(sceneId)) return { saved: false };
  await upsertCompletion(userId, sceneId, Math.max(0, Math.floor(mistakes)));
  return { saved: true };
}
