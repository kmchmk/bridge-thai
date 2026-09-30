import "server-only";
import { allLines } from "./allowlist";
import { ttsHash } from "./hash";
import type { TtsProvider } from "./provider";
import { staticClipFile } from "./static-clips";

/** How many of the app's lines ship with audio for this exact provider + voice + style. */
export function clipCoverage(provider: TtsProvider, lang: "th" | "en" = "th") {
  const lines = allLines(lang);
  const shipped = lines.filter((l) => staticClipFile(ttsHash({ text: l.text, voice: provider.voiceFor(l.gender), provider: provider.name }))).length;
  return { total: lines.length, shipped };
}
