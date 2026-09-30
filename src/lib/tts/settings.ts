import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ACCENTS, getAccent, type AccentId } from "@/lib/accents";
import { getRegion, REGION_PACKS } from "@/lib/regions";
import type { Region } from "@/lib/register/types";
import { GEMINI_VOICES, isPace, type PaceKey } from "./voices";

/** How a region's audio is spoken: plain Central Thai pronunciation, or with an accent hint (experimental). */
export type RegionAudioMode = "central" | "accent";
export interface RegionAudio {
  mode: RegionAudioMode;
  /** Admin-edited accent prompt; falls back to the region pack's default hint. */
  hint: string;
}

export interface TtsSettings {
  male: string;
  female: string;
  pace: PaceKey;
  regions: Record<Region, RegionAudio>;
  /** English accent prompts (always applied: the accent is the point of the choice). */
  accents: Record<AccentId, { hint: string }>;
}

const KEYS = { male: "tts.voice.male", female: "tts.voice.female", pace: "tts.pace" } as const;
const TTL_MS = 15_000;
let cache: { at: number; value: TtsSettings } | undefined;

/** Env supplies defaults; the admin page overrides them in the database. */
function defaults(): TtsSettings {
  return {
    male: process.env.TTS_VOICE_MALE ?? "Charon",
    female: process.env.TTS_VOICE_FEMALE ?? "Kore",
    pace: "learner",
    // Accent hints are opt-in per region until a native speaker has judged them.
    regions: Object.fromEntries(REGION_PACKS.map((p) => [p.id, { mode: "central", hint: p.accentHint }])) as Record<Region, RegionAudio>,
    accents: Object.fromEntries(ACCENTS.map((a) => [a.id, { hint: a.accentHint }])) as Record<AccentId, { hint: string }>,
  };
}

const regionKey = (id: Region, field: "mode" | "hint") => `tts.region.${id}.${field}`;
const accentKey = (id: AccentId) => `tts.accent.${id}.hint`;

const validVoice = (v: string) => GEMINI_VOICES.some((g) => g.name === v);

export async function getTtsSettings(): Promise<TtsSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = defaults();
  try {
    const keys = [...Object.values(KEYS), ...REGION_PACKS.flatMap((p) => [regionKey(p.id, "mode"), regionKey(p.id, "hint")]), ...ACCENTS.map((a) => accentKey(a.id))];
    const rows = await getDb().select().from(schema.appSettings).where(inArray(schema.appSettings.key, keys));
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const male = map.get(KEYS.male), female = map.get(KEYS.female), pace = map.get(KEYS.pace);
    if (male && validVoice(male)) value.male = male;
    if (female && validVoice(female)) value.female = female;
    if (pace && isPace(pace)) value.pace = pace;
    for (const p of REGION_PACKS) {
      const mode = map.get(regionKey(p.id, "mode")), hint = map.get(regionKey(p.id, "hint"));
      if (mode === "accent" || mode === "central") value.regions[p.id].mode = mode;
      if (hint && hint.trim()) value.regions[p.id].hint = hint.trim().slice(0, 400);
    }
    for (const a of ACCENTS) {
      const hint = map.get(accentKey(a.id));
      if (hint && hint.trim()) value.accents[a.id].hint = hint.trim().slice(0, 400);
    }
  } catch {
    // DB unreachable → fall back to env defaults rather than breaking playback.
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveTtsSettings(next: Pick<TtsSettings, "male" | "female" | "pace">, updatedBy: string) {
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

export async function saveRegionAudio(region: Region, mode: RegionAudioMode, hint: string, updatedBy: string) {
  if (!REGION_PACKS.some((p) => p.id === region) || (mode !== "central" && mode !== "accent")) throw new Error("Invalid region audio settings");
  const clean = hint.trim().slice(0, 400) || getRegion(region).accentHint;
  for (const [key, value] of [[regionKey(region, "mode"), mode], [regionKey(region, "hint"), clean]] as const) {
    await getDb()
      .insert(schema.appSettings)
      .values({ key, value, updatedBy })
      .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: new Date(), updatedBy } });
  }
  cache = undefined;
}

/** region → audio mode, for the "Central pronunciation" labels in the UI. */
export async function getRegionAudioModes(): Promise<Record<Region, RegionAudioMode>> {
  const s = await getTtsSettings();
  return Object.fromEntries(REGION_PACKS.map((p) => [p.id, s.regions[p.id].mode])) as Record<Region, RegionAudioMode>;
}

export async function saveAccentHint(accent: AccentId, hint: string, updatedBy: string) {
  if (!ACCENTS.some((a) => a.id === accent)) throw new Error("Invalid accent");
  const value = hint.trim().slice(0, 400) || getAccent(accent).accentHint;
  await getDb()
    .insert(schema.appSettings)
    .values({ key: accentKey(accent), value, updatedBy })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value, updatedAt: new Date(), updatedBy } });
  cache = undefined;
}
