/**
 * Cloud TTS provider seam. Provider choice (Azure / Google / ElevenLabs) is deferred:
 * implement `TtsProvider` and return it from `getProvider()` once one is picked.
 * Until then the client falls back to the browser's speechSynthesis.
 */
export interface TtsProvider {
  name: string;
  voiceFor(gender: "male" | "female"): string;
  synthesize(text: string, voice: string): Promise<{ audio: ArrayBuffer; contentType: string }>;
}

export function getProvider(): TtsProvider | null {
  return null;
}
