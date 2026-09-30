import { INVERSE, addressWord, greeting, isPolite, lexiconFor, particles, selfWord } from "./tables";
import { getRegion } from "@/lib/regions";
import type { Gender, LineTemplate, RegisterNote, RenderedLine, Relationship, Setup, Word } from "./types";

type Slots = Record<string, Word>;

const other = (g: Gender): Gender => (g === "male" ? "female" : "male");

/** Resolve every slot for `speaker` talking to `listener`. */
function slotsFor(
  speaker: Gender,
  listener: Gender,
  relationship: Relationship,
  region: Setup["region"],
): Slots {
  const p = particles(relationship, speaker, region);
  const slots: Slots = {
    I: selfWord(relationship, speaker, region),
    YOU: addressWord(relationship, listener, region),
    P: p.statement,
    Q: p.question,
    HI: greeting(relationship, speaker, region),
  };
  Object.assign(slots, lexiconFor(region));
  return slots;
}

function fill(template: string, slots: Slots, key: "th" | "rom"): string {
  const out = template.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const word = slots[name];
    if (!word) throw new Error(`Unknown slot {${name}} in "${template}"`);
    return word[key];
  });
  // Tidy the gaps left by empty particles, e.g. "ไหม " at end of line.
  return out.replace(/\s+/g, " ").trim();
}

function renderWith(line: LineTemplate, slots: Slots): RenderedLine {
  return { th: fill(line.th, slots, "th"), rom: fill(line.rom, slots, "rom"), en: line.en };
}

/** What the *learner* says, under the chosen setup. */
export function renderLearner(line: LineTemplate, setup: Setup): RenderedLine {
  return renderWith(line, slotsFor(setup.speakerGender, setup.listenerGender, setup.relationship, setup.region));
}

/** What the *NPC* says to the learner: roles are reversed. */
export function renderNpc(line: LineTemplate, setup: Setup): RenderedLine {
  return renderWith(
    line,
    slotsFor(setup.listenerGender, setup.speakerGender, INVERSE[setup.relationship], setup.region),
  );
}

export type MistakeKind = "too-casual" | "too-stiff" | "wrong-gender";

export interface Distractor {
  kind: MistakeKind;
  line: RenderedLine;
}

/**
 * Register-based wrong answers, derived automatically from the same template:
 *  - too-casual / too-stiff: same sentence in the wrong politeness level
 *  - wrong-gender: the other gender's pronouns and particles
 * Duplicates of the right answer (or of each other) are dropped.
 */
export function distractorsFor(line: LineTemplate, setup: Setup): Distractor[] {
  const correct = renderLearner(line, setup);
  const candidates: Distractor[] = [];

  const politeNow = isPolite(setup.relationship);
  candidates.push({
    kind: politeNow ? "too-casual" : "too-stiff",
    line: renderLearner(line, { ...setup, relationship: politeNow ? "friend" : "stranger" }),
  });
  candidates.push({
    kind: "wrong-gender",
    line: renderLearner(line, { ...setup, speakerGender: other(setup.speakerGender) }),
  });

  const seen = new Set([correct.th]);
  return candidates.filter((c) => {
    if (seen.has(c.line.th)) return false;
    seen.add(c.line.th);
    return true;
  });
}

const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  friend: "a friend your age",
  older: "someone a bit older (พี่)",
  elder: "someone from your parents' generation",
  younger: "someone younger (น้อง)",
  child: "someone much younger",
  stranger: "a stranger / customer-service situation",
};

/** Explain the register choices behind a rendered learner line. */
export function explain(setup: Setup): RegisterNote[] {
  const slots = slotsFor(setup.speakerGender, setup.listenerGender, setup.relationship, setup.region);
  const who = RELATIONSHIP_LABEL[setup.relationship];
  const g = setup.speakerGender;
  const notes: RegisterNote[] = [
    { slot: "I", word: slots.I.th, why: `How a ${g} speaker refers to themself when talking to ${who}.` },
    { slot: "YOU", word: slots.YOU.th, why: `How you address ${who}.` },
  ];
  const q = slots.Q.th;
  if (slots.P.th) {
    notes.push({
      slot: "P",
      word: q && q !== slots.P.th ? `${slots.P.th} / ${q}` : slots.P.th,
      why: isPolite(setup.relationship)
        ? getRegion(setup.region).particles?.polite
          ? `Polite ending for a ${g} speaker in ${getRegion(setup.region).label}.`
          : `Polite ending for a ${g} speaker (statements / questions).`
        : "Soft, friendly ending — no formal politeness needed here.",
    });
  }
  const pack = getRegion(setup.region);
  if (pack.kind !== "standard") {
    notes.push({
      slot: "region",
      word: pack.lexicon.delicious?.th ?? "",
      why:
        pack.kind === "dialect"
          ? `Regional words in this scene follow the ${pack.label} dialect${pack.reviewed ? "" : " (draft — awaiting native review)"}. Dialect romanization is approximate.`
          : `${pack.label}: Central Thai vocabulary; the difference is mostly accent.`,
    });
  }
  return notes;
}
