import { buildAdventureContent } from "@/lib/adventure/content";
import type { AdventureContent } from "@/lib/adventure/model";
import { SCENES } from "@/lib/content";
import { EN_SCENES, buildEnSteps, type Formality } from "@/lib/english";
import { buildSteps, type StepView } from "@/lib/game";
import type { Gender, Region, Setup } from "@/lib/register/types";
import type { AccentId } from "@/lib/accents";
import { LOCATIONS } from "./catalog";
export interface Encounter {
  id: string;
  title: string;
  steps: StepView[];
  context: string;
}
export interface AtlasContent {
  picnic: AdventureContent;
  thai: Record<Gender, Encounter[]>;
  english: Record<string, Encounter[]>;
}
export function buildAtlasContent(): AtlasContent {
  const thai = Object.fromEntries(
    (["male", "female"] as const).map((gender) => [
      gender,
      SCENES.map((scene) => {
        const l = LOCATIONS.find((l) => l.id === scene.id)!;
        const setup: Setup = {
          speakerGender: gender,
          listenerGender: l.gender,
          relationship: l.relationship,
          region: l.region as Region,
        };
        const steps = buildSteps(scene, setup);
        for (const [i, step] of steps.entries()) {
          for (const c of step.choices)
            if (c.id === "too-stiff") {
              c.correct = true;
              c.feedback =
                "Polite speech is welcome here too. Friends may also use a warmer casual version.";
            }
          const other = steps[(i + 1) % steps.length].choices.find(
            (c) => c.id === "ok",
          )!;
          if (!step.choices.some((c) => c.line.text === other.line.text))
            step.choices.push({
              ...other,
              id: "different-intent",
              correct: false,
              feedback: `That means “${other.line.gloss}”. Listen for what this person is asking.`,
            });
          const seen = new Set<string>();
          step.choices = step.choices.filter((c) => {
            const key = c.line.text.replace(/\s/g, "");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        return {
          id: scene.id,
          title: scene.title,
          steps:
            buildAdventureContent()[gender].find((m) => m.sceneId === scene.id)
              ?.steps ?? steps,
          context: `${l.region} · ${l.relationship === "elder" ? "speaking respectfully to an elder" : l.relationship === "friend" ? "a friend" : "a new acquaintance"}`,
        };
      }),
    ]),
  ) as Record<Gender, Encounter[]>;
  const english: Record<string, Encounter[]> = {};
  for (const gender of ["male", "female"] as const)
    for (const accent of ["us", "uk", "au"] as AccentId[])
      for (const formality of ["casual", "neutral", "formal"] as Formality[]) {
        english[`${gender}:${accent}:${formality}`] = EN_SCENES.map((scene) => {
          const l = LOCATIONS.find((l) => l.id === scene.id)!;
          return {
            id: scene.id,
            title: scene.titleEn,
            steps: buildEnSteps(scene, {
              speakerGender: gender,
              listenerGender: l.gender,
              accent,
              formality,
            }),
            context: `${accent.toUpperCase()} English · ${formality}`,
          };
        });
      }
  return { thai, english, picnic: buildAdventureContent() };
}
