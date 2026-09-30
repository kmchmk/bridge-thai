import "server-only";
import { count, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { allLines } from "./allowlist";
import { ttsHash } from "./hash";
import type { TtsProvider } from "./provider";

/** How many of the app's lines already have audio for this exact provider + voice + style. */
export async function cacheCoverage(provider: TtsProvider) {
  const lines = allLines();
  const hashes = lines.map((l) => ttsHash({ text: l.text, voice: provider.voiceFor(l.gender), provider: provider.name }));
  let cached = 0;
  for (let i = 0; i < hashes.length; i += 100) {
    const [row] = await getDb().select({ n: count() }).from(schema.ttsCache).where(inArray(schema.ttsCache.hash, hashes.slice(i, i + 100)));
    cached += row?.n ?? 0;
  }
  const [all] = await getDb().select({ n: count() }).from(schema.ttsCache);
  return { total: lines.length, cached, allClipsEver: all?.n ?? 0 };
}
