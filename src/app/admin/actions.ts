"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/admin";
import { saveTtsSettings } from "@/lib/tts/settings";
import { isPace } from "@/lib/tts/voices";

export async function saveVoiceSettings(male: string, female: string, pace: string) {
  const admin = await getAdmin();
  if (!admin) throw new Error("Not authorized");
  if (!isPace(pace)) throw new Error("Invalid pace");
  await saveTtsSettings({ male, female, pace }, admin.email);
  revalidatePath("/admin");
  return { saved: true };
}
