import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ttsHash } from "./hash";
import type { TtsProvider } from "./provider";

/** Returns a public audio URL, generating + uploading it only on a cache miss. */
export async function getAudioUrl(provider: TtsProvider, text: string, gender: "male" | "female") {
  const voice = provider.voiceFor(gender);
  const hash = ttsHash({ text, voice, provider: provider.name });
  const db = getDb();

  const [hit] = await db.select().from(schema.ttsCache).where(eq(schema.ttsCache.hash, hash)).limit(1);
  if (hit) return hit.url;

  const { audio, contentType } = await provider.synthesize(text, voice);
  const ext = contentType.includes("wav") ? "wav" : "mp3";
  const blob = await put(`tts/${hash}.${ext}`, audio, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await db
    .insert(schema.ttsCache)
    .values({ hash, text, voice, provider: provider.name, url: blob.url })
    .onConflictDoNothing();
  return blob.url;
}
