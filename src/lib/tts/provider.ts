import { createOpenRouterProvider } from "./openrouter";

/**
 * Cloud TTS provider seam. The model and per-gender voices are configuration,
 * not code, so trying another OpenRouter model is an env-var change:
 *   OPENROUTER_API_KEY, TTS_MODEL, TTS_VOICE_MALE, TTS_VOICE_FEMALE,
 *   TTS_PROVIDER_OPTIONS (optional JSON passed as `provider.options`).
 * Returns null when unconfigured; the client then falls back to browser speech.
 */
export interface TtsProvider {
  /** Part of the cache key: changing model or provider never reuses old audio. */
  name: string;
  voiceFor(gender: "male" | "female"): string;
  synthesize(text: string, voice: string): Promise<{ audio: ArrayBuffer; contentType: string }>;
}

export function getProvider(): TtsProvider | null {
  const { OPENROUTER_API_KEY, TTS_MODEL, TTS_VOICE_MALE, TTS_VOICE_FEMALE, TTS_PROVIDER_OPTIONS } = process.env;
  if (!OPENROUTER_API_KEY || !TTS_MODEL || !TTS_VOICE_MALE || !TTS_VOICE_FEMALE) return null;
  return createOpenRouterProvider({
    apiKey: OPENROUTER_API_KEY,
    model: TTS_MODEL,
    voices: { male: TTS_VOICE_MALE, female: TTS_VOICE_FEMALE },
    providerOptions: TTS_PROVIDER_OPTIONS ? JSON.parse(TTS_PROVIDER_OPTIONS) : undefined,
  });
}
