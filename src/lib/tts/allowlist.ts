import { SCENES } from "@/lib/content";
import { EN_SCENES, FORMALITIES, buildEnSteps } from "@/lib/english";
import { ACCENT_IDS } from "@/lib/accents";
import { buildSteps } from "@/lib/game";
import { PREVIEW_LINES, PREVIEW_LINES_EN } from "./preview";
import { REGION_IDS, type Gender, type Setup } from "@/lib/register/types";

export interface Line {
  text: string;
  gender: Gender;
  lang: "th" | "en";
}

const GENDERS: Gender[] = ["male", "female"];
const RELATIONSHIPS: Setup["relationship"][] = ["friend", "older", "elder", "younger", "stranger"];

let cached: Map<string, Line> | undefined;

const keyOf = (text: string, gender: Gender, lang: "th" | "en") => `${lang}\u0000${gender}\u0000${text}`;

function build() {
  const map = new Map<string, Line>();
  const put = (text: string, gender: Gender, lang: "th" | "en") => map.set(keyOf(text, gender, lang), { text, gender, lang });
  for (const g of GENDERS) {
    put(PREVIEW_LINES[g].th, g, "th");
    put(PREVIEW_LINES_EN[g].en, g, "en");
  }
  for (const scene of SCENES)
    for (const speakerGender of GENDERS)
      for (const listenerGender of GENDERS)
        for (const relationship of RELATIONSHIPS)
          for (const region of REGION_IDS)
            for (const step of buildSteps(scene, { speakerGender, listenerGender, relationship, region })) {
              put(step.npc.text, listenerGender, "th");
              for (const c of step.choices) put(c.line.text, speakerGender, "th");
            }
  for (const scene of EN_SCENES)
    for (const speakerGender of GENDERS)
      for (const listenerGender of GENDERS)
        for (const formality of FORMALITIES)
          for (const accent of ACCENT_IDS)
            for (const step of buildEnSteps(scene, { speakerGender, listenerGender, formality, accent })) {
              put(step.npc.text, listenerGender, "en");
              for (const c of step.choices) put(c.line.text, speakerGender, "en");
            }
  return map;
}

/**
 * Every sentence the app can ever speak, with the voice gender that speaks it:
 * NPC lines use the listener's gender, the learner's lines (right and wrong answers) the speaker's.
 * The TTS endpoint serves only these, so it can't be used to synthesize arbitrary text.
 * Defaults to the Thai course (what "warm cache" and coverage stats count).
 */
export function allLines(lang: "th" | "en" = "th"): Line[] {
  cached ??= build();
  return [...cached.values()].filter((l) => l.lang === lang);
}

export function isKnownLine(text: string, gender: Gender, lang: "th" | "en" = "th"): boolean {
  cached ??= build();
  return cached.has(keyOf(text, gender, lang));
}
