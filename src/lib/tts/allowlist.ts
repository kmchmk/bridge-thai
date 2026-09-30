import { SCENES } from "@/lib/content";
import { buildSteps } from "@/lib/game";
import { PREVIEW_LINES } from "./preview";
import { REGION_IDS, type Gender, type Setup } from "@/lib/register/types";

export interface Line {
  text: string;
  gender: Gender;
}

const GENDERS: Gender[] = ["male", "female"];
const RELATIONSHIPS: Setup["relationship"][] = ["friend", "older", "elder", "younger", "stranger"];

let cached: Map<string, Line> | undefined;

const keyOf = (text: string, gender: Gender) => `${gender}\u0000${text}`;

/**
 * Every sentence the app can ever speak, with the voice gender that speaks it:
 * NPC lines use the listener's gender, the learner's lines (right and wrong answers) the speaker's.
 * The TTS endpoint serves only these, so it can't be used to synthesize arbitrary text.
 */
export function allLines(): Line[] {
  if (!cached) {
    cached = new Map();
    for (const g of GENDERS) cached.set(keyOf(PREVIEW_LINES[g].th, g), { text: PREVIEW_LINES[g].th, gender: g });
    for (const scene of SCENES)
      for (const speakerGender of GENDERS)
        for (const listenerGender of GENDERS)
          for (const relationship of RELATIONSHIPS)
            for (const region of REGION_IDS) {
              const setup: Setup = { speakerGender, listenerGender, relationship, region };
              for (const step of buildSteps(scene, setup)) {
                const add = (text: string, gender: Gender) => cached!.set(keyOf(text, gender), { text, gender });
                add(step.npc.th, listenerGender);
                for (const c of step.choices) add(c.line.th, speakerGender);
              }
            }
  }
  return [...cached.values()];
}

export function isKnownLine(text: string, gender: Gender): boolean {
  allLines();
  return cached!.has(keyOf(text, gender));
}
