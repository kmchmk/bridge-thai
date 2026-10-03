import type { Scene } from "./content";
import {
  distractorsFor,
  renderLearner,
  renderNpc,
  type MistakeKind,
} from "./register/engine";
import type { RenderedLine, Setup } from "./register/types";

/** One line as the player shows it, whichever language is being learned. */
export interface LineView {
  /** The line in the language being learned (Thai script or English). */
  text: string;
  /** Romanization (Thai course only). */
  sub?: string;
  /** Meaning in the learner's own language. */
  gloss: string;
}

export interface Choice {
  id: string;
  line: LineView;
  correct: boolean;
  /** Why a wrong choice is wrong (already in the learner's language). */
  feedback: string | null;
}

export interface StepView {
  npc: LineView;
  prompt: string;
  /** Explicit task for English menus; English-course prompts also have Thai text. */
  promptEn?: string;
  choices: Choice[];
  /** Shown after a correct answer. */
  tip?: string;
}

const toView = (l: RenderedLine): LineView => ({
  text: l.th,
  sub: l.rom,
  gloss: l.en,
});

/** Small deterministic PRNG so server and client render the same choice order. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const MISTAKE_FEEDBACK: Record<MistakeKind, string> = {
  "too-casual":
    "This exercise asks for polite speech with this person. Try the polite ending; the casual form is not a grammar error.",
  "too-stiff":
    "This polite version is also valid. Friends can choose a more casual register.",
  "wrong-gender":
    "For this exercise, match the speaking style you selected. Pronouns and endings depend on the speaker’s chosen style, not the listener’s gender.",
};

export function buildSteps(scene: Scene, setup: Setup): StepView[] {
  return scene.steps.map((step, i) => {
    const choices: Choice[] = [
      {
        id: "ok",
        line: toView(renderLearner(step.you, setup)),
        correct: true,
        feedback: null,
      },
      ...distractorsFor(step.you, setup).map((d) => ({
        id: d.kind,
        line: toView(d.line),
        correct: d.kind === "too-stiff",
        feedback: MISTAKE_FEEDBACK[d.kind],
      })),
    ];
    const rand = seeded(`${scene.id}:${i}:${Object.values(setup).join("|")}`);
    for (let j = choices.length - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [choices[j], choices[k]] = [choices[k], choices[j]];
    }
    return {
      npc: toView(renderNpc(step.npc, setup)),
      prompt: step.prompt,
      choices,
    };
  });
}

/** 3 stars = no slips, 2 = one, 1 = more. */
export const starsFor = (mistakes: number) =>
  mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
