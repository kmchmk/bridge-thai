import type { Scene } from "./content";
import { distractorsFor, renderLearner, renderNpc, type MistakeKind } from "./register/engine";
import type { RenderedLine, Setup } from "./register/types";

export interface Choice {
  id: string;
  line: RenderedLine;
  /** null = the correct answer for this setup. */
  mistake: MistakeKind | null;
}

export interface StepView {
  npc: RenderedLine;
  prompt: string;
  choices: Choice[];
}

/** Small deterministic PRNG so server and client render the same choice order. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function buildSteps(scene: Scene, setup: Setup): StepView[] {
  return scene.steps.map((step, i) => {
    const choices: Choice[] = [
      { id: "ok", line: renderLearner(step.you, setup), mistake: null },
      ...distractorsFor(step.you, setup).map((d) => ({ id: d.kind, line: d.line, mistake: d.kind })),
    ];
    const rand = seeded(`${scene.id}:${i}:${Object.values(setup).join("|")}`);
    for (let j = choices.length - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [choices[j], choices[k]] = [choices[k], choices[j]];
    }
    return { npc: renderNpc(step.npc, setup), prompt: step.prompt, choices };
  });
}

export const MISTAKE_FEEDBACK: Record<MistakeKind, string> = {
  "too-casual": "Too casual — that's how you'd talk to a close friend, not to this person.",
  "too-stiff": "Too formal — this person is a friend or younger, so that sounds stiff.",
  "wrong-gender": "Those pronouns and endings belong to the other gender's speech.",
};

/** 3 stars = no slips, 2 = one, 1 = more. */
export const starsFor = (mistakes: number) => (mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);
