import "server-only";
import { inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { scenesFor } from "@/lib/content";
import { EN_SCENES, buildEnSteps, type EnSetup } from "@/lib/english";
import { buildSteps } from "@/lib/game";
import type { Gender, Setup } from "@/lib/register/types";
import { type Line } from "./allowlist";
import { ttsHash } from "./hash";
import type { TtsProvider } from "./provider";

const dedupe = (lines: Line[]) => [...new Map(lines.map((l) => [`${l.gender}\u0000${l.text}`, l])).values()];

/** Every line a learner can hit with this exact setup (Thai course). */
export function linesForThaiSetup(setup: Setup): Line[] {
  const out: Line[] = [];
  for (const scene of scenesFor(setup))
    for (const step of buildSteps(scene, setup)) {
      out.push({ text: step.npc.text, gender: setup.listenerGender, lang: "th" });
      for (const c of step.choices) out.push({ text: c.line.text, gender: setup.speakerGender, lang: "th" });
    }
  return dedupe(out);
}

/** Every line a learner can hit with this exact setup (English course). */
export function linesForEnglishSetup(setup: EnSetup): Line[] {
  const out: Line[] = [];
  for (const scene of EN_SCENES)
    for (const step of buildEnSteps(scene, setup)) {
      out.push({ text: step.npc.text, gender: setup.listenerGender, lang: "en" });
      for (const c of step.choices) out.push({ text: c.line.text, gender: setup.speakerGender, lang: "en" });
    }
  return dedupe(out);
}

export type ManifestItem = [text: string, gender: "m" | "f", file: string];

/** Which of these lines already have audio, and where. Lines without audio yet are simply left out (they generate on first play). */
export async function resolveClips(provider: TtsProvider, lines: Line[]): Promise<{ base: string; items: ManifestItem[] }> {
  const hashes = new Map<string, Line>();
  for (const l of lines) hashes.set(ttsHash({ text: l.text, voice: provider.voiceFor(l.gender as Gender), provider: provider.name }), l);
  const keys = [...hashes.keys()];
  const found = new Map<string, string>();
  for (let i = 0; i < keys.length; i += 400) {
    const rows = await getDb().select({ hash: schema.ttsCache.hash, url: schema.ttsCache.url }).from(schema.ttsCache).where(inArray(schema.ttsCache.hash, keys.slice(i, i + 400)));
    for (const r of rows) found.set(r.hash, r.url);
  }
  let base = "";
  const items: ManifestItem[] = [];
  for (const [hash, url] of found) {
    const l = hashes.get(hash)!;
    const at = url.indexOf("/tts/");
    if (at < 0) continue;
    base ||= url.slice(0, at + 1);
    if (!url.startsWith(base)) continue; // different store host: not part of this manifest
    items.push([l.text, l.gender === "male" ? "m" : "f", url.slice(base.length)]);
  }
  return { base, items };
}

