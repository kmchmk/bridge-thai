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
  const picnic = buildAdventureContent();
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
              feedback: `That means “${other.line.gloss}”. This step asks you to: ${step.prompt}`,
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
            picnic[gender].find((m) => m.sceneId === scene.id)?.steps ?? steps,
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
  // New multi-context rehearsal missions reuse prepared, authored utterances.
  // The guide role-plays each stop; this adds playable content without unrecorded speech.
  for (const gender of ["male", "female"] as const) {
    const l = LOCATIONS.find((l) => l.id === "picnic-rehearsal")!;
    const setup: Setup = {
      speakerGender: gender,
      listenerGender: l.gender,
      region: "bangkok",
      relationship: "stranger",
    };
    const parts: [string, number, string][] = [
      ["introduce-yourself", 0, "Introduce yourself:"],
      ["introduce-yourself", 1, "Meet a new friend:"],
      ["meet-parents", 0, "Welcome an older guest:"],
      ["restaurant", 1, "Order a shared meal:"],
      ["restaurant", 2, "Ask about spice:"],
      ["first-hello", 1, "Check in with your friend:"],
    ];
    thai[gender].push({
      id: l.id,
      title: "Be the picnic host",
      context: "Mali role-plays six moments from a shared picnic.",
      steps: parts.map(([id, index, prompt]) => {
        const step = buildSteps(
          SCENES.find((s) => s.id === id)!,
          setup,
        )[index];
        return { ...step, prompt: `${prompt} ${step.prompt}` };
      }),
    });
  }
  for (const [key, encounters] of Object.entries(english)) {
    const [gender, accent, formality] = key.split(":") as [
      Gender,
      AccentId,
      Formality,
    ];
    const l = LOCATIONS.find((l) => l.id === "en-weekend-rehearsal")!;
    const parts: [string, number, string][] = [
      ["en-directions", 0, "At the station:"],
      ["en-directions", 1, "Finding the route:"],
      ["en-hotel", 0, "Arriving at the hotel:"],
      ["en-hotel", 1, "Getting settled:"],
      ["en-coffee-shop", 0, "At the café:"],
      ["en-coffee-shop", 1, "Placing the order:"],
    ];
    encounters.push({
      id: l.id,
      title: "Welcome a visitor",
      context: "Morgan role-plays a visitor’s first afternoon.",
      steps: parts.map(([id, index, prompt]) => {
        const step = buildEnSteps(
          EN_SCENES.find((s) => s.id === id)!,
          {
            speakerGender: gender,
            listenerGender: l.gender,
            accent,
            formality,
          },
        )[index];
        return { ...step, promptEn: `${prompt} ${step.promptEn}` };
      }),
    });
  }
  return { thai, english, picnic };
}
