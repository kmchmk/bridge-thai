import { z } from "zod";
import {
  ACCENT_IDS,
  ACCENTS,
  SLOT_MEANING,
  getAccent,
  type AccentId,
} from "@/lib/accents";
import { seeded, type Choice, type StepView } from "@/lib/game";
import type { Gender, RegisterNote } from "@/lib/register/types";
import enCoffeeShop from "@/content/english/en-coffee-shop.json";
import enDirections from "@/content/english/en-directions.json";
import enFirstHello from "@/content/english/en-first-hello.json";
import enHotel from "@/content/english/en-hotel.json";
import enRestaurant from "@/content/english/en-restaurant.json";
import enShopping from "@/content/english/en-shopping.json";

/** How formal the conversation is: who the learner is talking to. */
export const FORMALITIES = ["casual", "neutral", "formal"] as const;
export type Formality = (typeof FORMALITIES)[number];

export interface EnSetup {
  speakerGender: Gender;
  listenerGender: Gender;
  formality: Formality;
  accent: AccentId;
}

export const DEFAULT_EN_SETUP: EnSetup = {
  speakerGender: "female",
  listenerGender: "male",
  formality: "neutral",
  accent: "us",
};

export const enSetupSchema = z.object({
  speakerGender: z.enum(["male", "female"]),
  listenerGender: z.enum(["male", "female"]),
  formality: z.enum(FORMALITIES),
  accent: z.enum(ACCENT_IDS),
});

/** A line as authored: English + its Thai meaning. `{slot}` placeholders vary by accent. */
const line = z.object({ en: z.string().min(1), th: z.string().min(1) });
/** `neutral` is required; casual/formal fall back to it when the wording would be identical. */
const variants = z.object({
  neutral: line,
  casual: line.optional(),
  formal: line.optional(),
});

export const enSceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  course: z.literal("en"),
  title: z.string(),
  titleEn: z.string(),
  blurb: z.string(),
  emoji: z.string(),
  reviewed: z.boolean(),
  steps: z
    .array(
      z.object({
        npc: variants,
        /** Thai instruction for what to say. */
        prompt: z.string(),
        promptEn: z.string().min(1),
        you: variants,
        /** Typical mistakes: shown as wrong choices, each with a Thai explanation. */
        wrong: z
          .array(
            z.object({
              en: z.string(),
              th: z.string(),
              why: z.string(),
              formality: z.array(z.enum(FORMALITIES)).optional(),
            }),
          )
          .min(3),
        /** Thai tip shown after a correct answer (pronunciation / grammar pitfall for Thai speakers). */
        tip: z.string().optional(),
      }),
    )
    .min(1),
});

export type EnScene = z.infer<typeof enSceneSchema>;

export const EN_SCENES: EnScene[] = [
  enFirstHello,
  enCoffeeShop,
  enRestaurant,
  enDirections,
  enHotel,
  enShopping,
].map((s) => enSceneSchema.parse(s));
export const getEnScene = (id: string) => EN_SCENES.find((s) => s.id === id);

const pick = (v: z.infer<typeof variants>, f: Formality) => v[f] ?? v.neutral;

/** Fill `{slot}` placeholders from the accent's lexicon. `{Slot}` (capitalised) capitalises the word. */
export function fillSlots(text: string, accent: AccentId): string {
  const lex = getAccent(accent).lexicon;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => {
    if (lex[name] !== undefined) return lex[name];
    const lower = name[0].toLowerCase() + name.slice(1);
    const w = lex[lower];
    return w === undefined ? m : w[0].toUpperCase() + w.slice(1);
  });
}

const render = (l: { en: string; th: string }, accent: AccentId) => ({
  text: fillSlots(l.en, accent),
  gloss: fillSlots(l.th, accent),
});

export function buildEnSteps(scene: EnScene, setup: EnSetup): StepView[] {
  return scene.steps.map((step, i) => {
    // Prefer mistakes that are specific to this formality (register slips), then the general ones.
    const wrong = step.wrong
      .filter((w) => !w.formality || w.formality.includes(setup.formality))
      .sort((a, b) => Number(!!b.formality) - Number(!!a.formality))
      .slice(0, 3);
    const choices: Choice[] = [
      {
        id: "ok",
        line: render(pick(step.you, setup.formality), setup.accent),
        correct: true,
        feedback: null,
      },
      ...wrong.map((w, j) => ({
        id: `w${j}`,
        line: render(w, setup.accent),
        correct: false,
        feedback: w.why,
      })),
    ];
    const rand = seeded(`${scene.id}:${i}:${setup.formality}:${setup.accent}`);
    for (let j = choices.length - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [choices[j], choices[k]] = [choices[k], choices[j]];
    }
    return {
      npc: render(pick(step.npc, setup.formality), setup.accent),
      prompt: step.prompt,
      promptEn: step.promptEn,
      choices,
      tip: step.tip,
    };
  });
}

const SLOT = /\{(\w+)\}/g;
const slotsIn = (scene: EnScene) => {
  const found = new Set<string>();
  const scan = (l?: { en: string; th: string }) =>
    l &&
    [...(l.en + l.th).matchAll(SLOT)].forEach((m) =>
      found.add(m[1][0].toLowerCase() + m[1].slice(1)),
    );
  for (const s of scene.steps) {
    for (const f of FORMALITIES) {
      scan(s.npc[f]);
      scan(s.you[f]);
    }
    s.wrong.forEach(scan);
  }
  return [...found];
};

/** "Why these words?" for English: the words that differ between US / UK / AU in this scene. */
export function explainEn(scene: EnScene, setup: EnSetup): RegisterNote[] {
  const chosen = getAccent(setup.accent);
  return slotsIn(scene)
    .filter((slot) => new Set(ACCENTS.map((a) => a.lexicon[slot])).size > 1)
    .map((slot) => ({
      slot,
      word: chosen.lexicon[slot],
      why: `${SLOT_MEANING[slot] ?? slot} — ${ACCENTS.map((a) => `${a.flag} ${a.lexicon[slot]}`).join(" · ")}`,
    }));
}

export const ENGLISH_SLOTS = (scene: EnScene) => slotsIn(scene);

type Params = Record<string, string | string[] | undefined>;

export function parseEnSetup(params: Params): EnSetup {
  const pick1 = (k: string) =>
    Array.isArray(params[k]) ? params[k]![0] : params[k];
  const parsed = enSetupSchema.safeParse({
    speakerGender: pick1("sg"),
    listenerGender: pick1("lg"),
    formality: pick1("fm"),
    accent: pick1("ac"),
  });
  return parsed.success ? parsed.data : DEFAULT_EN_SETUP;
}

export const enSetupQuery = (s: EnSetup) =>
  new URLSearchParams({
    sg: s.speakerGender,
    lg: s.listenerGender,
    fm: s.formality,
    ac: s.accent,
  }).toString();

const FORMALITY_TH: Record<Formality, string> = {
  casual: "เพื่อน / คนสนิท",
  neutral: "คนทั่วไป",
  formal: "ทางการ",
};
const GENDER_TH = { male: "ผู้ชาย", female: "ผู้หญิง" } as const;

export function describeEnSetup(s: EnSetup): string {
  const a = getAccent(s.accent);
  return `${GENDER_TH[s.speakerGender]} → ${GENDER_TH[s.listenerGender]} · ${FORMALITY_TH[s.formality]} · ${a.flag} ${a.labelTh}`;
}
