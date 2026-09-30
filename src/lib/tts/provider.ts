import { createOpenRouterProvider } from "./openrouter";
import type { Region } from "@/lib/register/types";
import { getTtsSettings, type RegionAudioMode } from "./settings";
import { PACES, type PaceKey } from "./voices";

/**
 * Cloud TTS provider seam. Model is env config; voices and pace come from admin-editable settings
 * (env values are the defaults):
 *   OPENROUTER_API_KEY, TTS_MODEL, TTS_VOICE_MALE, TTS_VOICE_FEMALE (defaults),
 *   TTS_PROVIDER_OPTIONS (optional JSON, overrides the pace style),
 *   TTS_FORMAT ("pcm" default → WAV, or "mp3"), TTS_PCM_RATE (default 24000).
 * Returns null when unconfigured; the client then falls back to browser speech.
 */
export interface TtsProvider {
  /** Part of the cache key: changing model or style never reuses old audio. */
  name: string;
  /** File extension of the audio this provider returns (part of the storage path). */
  extension: "mp3" | "wav";
  voiceFor(gender: "male" | "female"): string;
  synthesize(text: string, voice: string): Promise<{ audio: ArrayBuffer; contentType: string }>;
}

export interface ProviderOverride {
  male?: string;
  female?: string;
  pace?: PaceKey;
  /** Region whose accent setting applies (default: Central / Bangkok). */
  region?: Region;
  /** Force a mode instead of using the region's saved one (admin audition). */
  mode?: RegionAudioMode;
  /** Force an accent prompt (admin audition of unsaved text). */
  hint?: string;
}

export async function getProvider(override?: ProviderOverride): Promise<TtsProvider | null> {
  const { OPENROUTER_API_KEY, TTS_MODEL, TTS_PROVIDER_OPTIONS, TTS_FORMAT, TTS_PCM_RATE } = process.env;
  if (!OPENROUTER_API_KEY || !TTS_MODEL) return null;
  const saved = await getTtsSettings();
  const settings = { ...saved, male: override?.male ?? saved.male, female: override?.female ?? saved.female, pace: override?.pace ?? saved.pace };

  // Gemini TTS takes a natural-language style hint (pace + optional regional accent); other models ignore it.
  const regionAudio = saved.regions[override?.region ?? "bangkok"];
  const accent = (override?.mode ?? regionAudio.mode) === "accent" ? (override?.hint ?? regionAudio.hint) : "";
  const style = [PACES[settings.pace].style, accent].filter(Boolean).join(" ");
  const providerOptions = TTS_PROVIDER_OPTIONS
    ? JSON.parse(TTS_PROVIDER_OPTIONS)
    : TTS_MODEL.startsWith("google/") && style
      ? { "google-ai-studio": { speech_metadata: { style } } }
      : undefined;

  return createOpenRouterProvider({
    apiKey: OPENROUTER_API_KEY,
    model: TTS_MODEL,
    voices: { male: settings.male, female: settings.female },
    providerOptions,
    format: TTS_FORMAT === "mp3" ? "mp3" : "pcm",
    sampleRate: TTS_PCM_RATE ? Number(TTS_PCM_RATE) : undefined,
  });
}
