import "server-only";
import { scenesFor } from "@/lib/content";
import { EN_SCENES, buildEnSteps, type EnSetup } from "@/lib/english";
import { buildSteps } from "@/lib/game";
import type { Gender, Setup } from "@/lib/register/types";
import { type Line } from "./allowlist";
import { ttsHash } from "./hash";
import type { PlaybackIdentity } from "./provider";
import { STATIC_BASE, staticClipFile } from "./static-clips";

const dedupe = (lines: Line[]) => [
  ...new Map(lines.map((l) => [`${l.gender}\u0000${l.text}`, l])).values(),
];

/** Every line a learner can hit with this exact setup (Thai course). */
export function linesForThaiSetup(setup: Setup): Line[] {
  const out: Line[] = [];
  for (const scene of scenesFor(setup))
    for (const step of buildSteps(scene, setup)) {
      out.push({
        text: step.npc.text,
        gender: setup.listenerGender,
        lang: "th",
      });
      for (const c of step.choices)
        out.push({
          text: c.line.text,
          gender: setup.speakerGender,
          lang: "th",
        });
    }
  return dedupe(out);
}

/** Every line a learner can hit with this exact setup (English course). */
export function linesForEnglishSetup(setup: EnSetup): Line[] {
  const out: Line[] = [];
  for (const scene of EN_SCENES)
    for (const step of buildEnSteps(scene, setup)) {
      out.push({
        text: step.npc.text,
        gender: setup.listenerGender,
        lang: "en",
      });
      for (const c of step.choices)
        out.push({
          text: c.line.text,
          gender: setup.speakerGender,
          lang: "en",
        });
    }
  return dedupe(out);
}

export type ManifestItem = [text: string, gender: "m" | "f", file: string];

/**
 * Which of these lines ship as static clips (using the `fallback` provider's clip, e.g. natural pace, when the requested pace has none yet).
 * Lines without any clip are left out (they fall back to browser speech).
 */
export function resolveClips(
  provider: PlaybackIdentity,
  lines: Line[],
  fallback?: PlaybackIdentity | null,
): { base: string; items: ManifestItem[] } {
  const items: ManifestItem[] = [];
  const fileFor = (p: PlaybackIdentity, l: Line) =>
    staticClipFile(
      ttsHash({
        text: l.text,
        voice: p.voiceFor(l.gender as Gender),
        provider: p.name,
      }),
    );
  for (const l of lines) {
    const file =
      fileFor(provider, l) ?? (fallback ? fileFor(fallback, l) : null);
    if (file) items.push([l.text, l.gender === "male" ? "m" : "f", file]);
  }
  return { base: STATIC_BASE, items };
}
