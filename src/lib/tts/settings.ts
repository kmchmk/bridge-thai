import { ACCENTS, type AccentId } from "@/lib/accents";
import { REGION_PACKS } from "@/lib/regions";
import type { Region } from "@/lib/register/types";
import type { PaceKey } from "./voices";

/** How a region's audio is spoken: plain Central Thai pronunciation, or with an accent hint (experimental, not shipped). */
export type RegionAudioMode = "central" | "accent";
export interface RegionAudio {
  mode: RegionAudioMode;
  /** Accent prompt (used only for admin auditions). */
  hint: string;
}

export interface TtsSettings {
  male: string;
  female: string;
  pace: PaceKey;
  regions: Record<Region, RegionAudio>;
  /** English accent prompts. */
  accents: Record<AccentId, { hint: string }>;
}

/**
 * The live voices are fixed in code: the audio clips that ship with the app (public/audio/tts) are made for exactly
 * these voices, pace and prompts. To change them, edit this file and rebuild the clips with `scripts/build-audio.ts`.
 * (Chosen by the native-speaker reviewer: Sadaltager and Aoede; regions use Central pronunciation.) Learners choose the pace
 * (slower by default, or natural); clips ship for both, so `pace` here is only the fallback when a request names none.
 */
const SETTINGS: TtsSettings = {
  male: "Sadaltager",
  female: "Aoede",
  pace: "natural",
  regions: Object.fromEntries(REGION_PACKS.map((p) => [p.id, { mode: "central", hint: p.accentHint }])) as Record<Region, RegionAudio>,
  accents: Object.fromEntries(ACCENTS.map((a) => [a.id, { hint: a.accentHint }])) as Record<AccentId, { hint: string }>,
};

export async function getTtsSettings(): Promise<TtsSettings> {
  return SETTINGS;
}

/** region → audio mode, for the "Central pronunciation" labels in the UI. */
export async function getRegionAudioModes(): Promise<Record<Region, RegionAudioMode>> {
  return Object.fromEntries(REGION_PACKS.map((p) => [p.id, SETTINGS.regions[p.id].mode])) as Record<Region, RegionAudioMode>;
}
