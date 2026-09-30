"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin";
import { isAccent } from "@/lib/accents";
import { isRegion } from "@/lib/regions";
import { saveAccentHint, saveRegionAudio, saveTtsSettings } from "@/lib/tts/settings";
import { isPace } from "@/lib/tts/voices";

export async function saveVoiceSettings(male: string, female: string, pace: string) {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorized");
  if (!isPace(pace)) throw new Error("Invalid pace");
  await saveTtsSettings({ male, female, pace }, admin.email);
  revalidatePath("/admin");
  return { saved: true };
}

export async function saveRegionAudioSettings(region: string, mode: string, hint: string) {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorized");
  if (!isRegion(region) || (mode !== "central" && mode !== "accent")) throw new Error("Invalid region settings");
  await saveRegionAudio(region, mode, hint, admin.email);
  revalidatePath("/admin");
  return { saved: true };
}

export async function saveAccentSettings(accent: string, hint: string) {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorized");
  if (!isAccent(accent)) throw new Error("Invalid accent");
  await saveAccentHint(accent, hint, admin.email);
  revalidatePath("/admin");
  return { saved: true };
}
