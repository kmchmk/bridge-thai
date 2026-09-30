import type { TtsProvider } from "./provider";
import { pcmToWav } from "./wav";

export interface OpenRouterTtsConfig {
  apiKey: string;
  model: string;
  voices: { male: string; female: string };
  /** Passed through as `provider.options`, e.g. { "google-ai-studio": { speech_metadata: { style: "warm" } } }. */
  providerOptions?: Record<string, unknown>;
  baseUrl?: string;
  /**
   * Gemini TTS on OpenRouter only supports raw `pcm` (16-bit mono, 24 kHz), which we wrap as WAV.
   * Use "mp3" for models that support it (smaller files).
   */
  format?: "pcm" | "mp3";
  sampleRate?: number;
}

function shortHash(s: string) {
  let h = 5381;
  for (const c of s) h = (Math.imul(h, 33) ^ c.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

const RETRYABLE = new Set([429, 502, 503, 504]);

/** OpenRouter's OpenAI-compatible speech endpoint: POST /audio/speech → raw audio bytes. */
export function createOpenRouterProvider(cfg: OpenRouterTtsConfig): TtsProvider {
  const baseUrl = cfg.baseUrl ?? "https://openrouter.ai/api/v1";
  const format = cfg.format ?? "pcm";
  // Style/provider options change how audio sounds, so they are part of the cache identity.
  const variant = cfg.providerOptions ? `#${shortHash(JSON.stringify(cfg.providerOptions))}` : "";
  return {
    name: `openrouter:${cfg.model}${variant}`,
    extension: format === "mp3" ? "mp3" : "wav",
    voiceFor: (gender) => cfg.voices[gender],
    async synthesize(text, voice) {
      const out = await synthesizeOnce({ ...cfg, baseUrl, format }, text, voice);
      return format === "pcm"
        ? { audio: pcmToWav(out.audio, cfg.sampleRate ?? 24_000), contentType: "audio/wav" }
        : out;
    },
  };
}

/** One synthesis call with a single retry on transient upstream errors (failed generations aren't billed). */
export async function synthesizeOnce(
  cfg: Required<Pick<OpenRouterTtsConfig, "apiKey" | "model" | "baseUrl">> & Pick<OpenRouterTtsConfig, "providerOptions" | "format">,
  text: string,
  voice: string,
) {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`${cfg.baseUrl}/audio/speech`, {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bridgethai.vercel.app",
        "X-Title": "Bridge Thai",
      },
      body: JSON.stringify({
        model: cfg.model,
        input: text,
        ...(voice ? { voice } : {}), // some models (e.g. Fish Audio) have no preset voices
        response_format: cfg.format ?? "mp3",
        ...(cfg.providerOptions ? { provider: { options: cfg.providerOptions } } : {}),
      }),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok && contentType.startsWith("audio/")) {
      const audio = await res.arrayBuffer();
      if (audio.byteLength < 500) throw new Error(`TTS returned suspiciously small audio (${audio.byteLength}B)`);
      return { audio, contentType };
    }
    // Errors come back as JSON, not audio.
    lastError = `${res.status} ${(await res.text()).slice(0, 300)}`;
    if (!RETRYABLE.has(res.status)) break;
  }
  throw new Error(`OpenRouter TTS failed: ${lastError}`);
}
