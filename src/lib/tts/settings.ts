import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { GEMINI_VOICES, isPace, type PaceKey } from "./voices";

export interface TtsSettings {
  male: string;
  female: string;
  pace: PaceKey;
}

const KEYS = { male: "tts.voice.male", female: "tts.voice.female", pace: "tts.pace" } as const;
const TTL_MS = 15_000;
let cache: { at: number; value: TtsSettings } | undefined;

/** Env supplies defaults; the admin page overrides them in the database. */
function defaults(): TtsSettings {
  return { male: process.env.TTS_VOICE_MALE ?? "Charon", female: process.env.TTS_VOICE_FEMALE ?? "Kore", pace: "learner" };
}

const validVoice = (v: string) => GEMINI_VOICES.some((g) => g.name === v);

export async function getTtsSettings(): Promise<TtsSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = defaults();
  try {
    const rows = await getDb().select().from(schema.appSettings).where(inArray(schema.appSettings.key, Object.values(KEYS)));
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const male = map.get(KEYS.male), female = map.get(KEYS.female), pace = map.get(KEYS.pace);
    if (male && validVoice(male)) value.male = male;
    if (female && validVoice(female)) value.female = female;
    if (pace && isPace(pace)) value.pace = pace;
  } catch {
    // DB unreachable → fall back to env defaults rather than breaking playback.
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveTtsSettings(next: TtsSettings, updatedBy: string) {
  if (!validVoice(next.male) || !validVoice(next.female) || !isPace(next.pace)) throw new Error("Invalid TTS settings");
  const rows = [
    { key: KEYS.male, value: next.male },
    { key: KEYS.female, value: next.female },
    { key: KEYS.pace, value: next.pace },
  ];
  for (const r of rows) {
    await getDb()
      .insert(schema.appSettings)
      .values({ ...r, updatedBy })
      .onConflictDoUpdate({ target: schema.appSettings.key, set: { value: r.value, updatedAt: new Date(), updatedBy } });
  }
  cache = undefined;
}

export async function deleteTtsSettings() {
  await getDb().delete(schema.appSettings).where(eq(schema.appSettings.key, KEYS.pace));
  cache = undefined;
}
