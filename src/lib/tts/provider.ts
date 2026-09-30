import { createOpenRouterProvider } from "./openrouter";
import { getTtsSettings } from "./settings";
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

export async function getProvider(override?: { male?: string; female?: string; pace?: PaceKey }): Promise<TtsProvider | null> {
  const { OPENROUTER_API_KEY, TTS_MODEL, TTS_PROVIDER_OPTIONS, TTS_FORMAT, TTS_PCM_RATE } = process.env;
  if (!OPENROUTER_API_KEY || !TTS_MODEL) return null;
  const settings = { ...(await getTtsSettings()), ...override };

  // Gemini TTS takes a natural-language style hint; other models ignore the pace setting.
  const style = PACES[settings.pace].style;
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
