"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getDb, schema } from "@/db";
import { upsertCompletion, upsertStep } from "@/db/progress";
import { getScene } from "@/lib/content";
import { enSetupSchema, type EnSetup } from "@/lib/english";
import { isNative, NATIVE_COOKIE, PACE_COOKIE } from "@/lib/lang";
import { isPaceChoice } from "@/lib/tts/ctx";
import { DEFAULT_SETUP, setupSchema } from "@/lib/setup";
import type { Setup } from "@/lib/register/types";

/** Remember the learner's language (cookie for everyone, profile too when signed in). */
export async function setNative(native: string) {
  if (!isNative(native)) throw new Error("Invalid language");
  (await cookies()).set(NATIVE_COOKIE, native, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  try {
    const { userId } = await auth();
    if (userId) {
      await getDb()
        .insert(schema.learnerProfiles)
        .values({ userId, ...DEFAULT_SETUP, native })
        .onConflictDoUpdate({ target: schema.learnerProfiles.userId, set: { native, updatedAt: new Date() } });
    }
  } catch {
    // The cookie is enough to switch; the profile catches up on the next save.
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

/** Remember the voice speed (slower / natural) on this device. */
export async function setPace(pace: string) {
  if (!isPaceChoice(pace)) throw new Error("Invalid pace");
  (await cookies()).set(PACE_COOKIE, pace, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
  return { saved: true };
}

/** Thai course: remember the last setup. */
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

/** English course: remember the last setup. */
export async function saveEnProfile(setup: EnSetup) {
  const { userId } = await auth();
  if (!userId) return { saved: false };
  const s = enSetupSchema.parse(setup);
  const en = { enSpeakerGender: s.speakerGender, enListenerGender: s.listenerGender, enFormality: s.formality, enAccent: s.accent, native: "th" };
  await getDb()
    .insert(schema.learnerProfiles)
    .values({ userId, ...DEFAULT_SETUP, ...en })
    .onConflictDoUpdate({ target: schema.learnerProfiles.userId, set: { ...en, updatedAt: new Date() } });
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
