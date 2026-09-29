import { createHash } from "node:crypto";

export interface TtsRequest {
  text: string;
  /** Provider voice id, e.g. "th-TH-PremwadeeNeural". Encodes gender too. */
  voice: string;
  provider: string;
}

/** Same text + voice + provider always maps to the same object, so audio is never generated twice. */
export function ttsHash({ text, voice, provider }: TtsRequest): string {
  return createHash("sha256").update(`${provider}\u0000${voice}\u0000${text.normalize("NFC")}`).digest("hex");
}
