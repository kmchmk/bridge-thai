/** A short story reuses prepared phrases without marking whole lessons complete. */
export const PICNIC_STEPS = [
  {
    scene: "first-hello",
    index: 0,
    goal: "Meet Mali",
    icon: "👋",
    effect: "Mali waves back. There’s room for one more at the picnic.",
  },
  {
    scene: "first-hello",
    index: 1,
    goal: "Make a friend",
    icon: "🧑‍🤝‍🧑",
    effect: "You checked in with Mali. She’ll meet you under the tree.",
  },
  {
    scene: "restaurant",
    index: 1,
    goal: "Bring lunch",
    icon: "🍛",
    effect: "One plate of pad kra pao appears on the counter.",
  },
  {
    scene: "restaurant",
    index: 2,
    goal: "Choose the spice",
    icon: "🌶️",
    effect: "The cook adds just a little chilli. Your lunch is ready.",
  },
  {
    scene: "fruit-market",
    index: 0,
    goal: "Find something to share",
    icon: "🍈",
    effect: "The seller shows you the durian: 150 baht per kilo.",
  },
  {
    scene: "fruit-market",
    index: 3,
    goal: "Choose how much",
    icon: "🍈 🍈",
    effect: "Two kilos go into your basket. Time to find Mali!",
  },
] as const;
export interface PicnicProgress {
  next: number;
  finished: boolean;
  missed: number[];
  supported: boolean;
  independentRecall: boolean;
  recallSupported: boolean;
}
export const freshPicnic = (): PicnicProgress => ({
  next: 0,
  finished: false,
  missed: [],
  supported: false,
  independentRecall: false,
  recallSupported: false,
});
export function parsePicnic(value: unknown): PicnicProgress {
  const v = value as Partial<PicnicProgress> | null;
  const next = Number.isInteger(v?.next)
    ? Math.max(0, Math.min(6, v!.next!))
    : 0;
  const finished = next === 6 && v?.finished === true;
  return {
    next,
    finished,
    missed: Array.isArray(v?.missed)
      ? [
          ...new Set(
            v.missed.filter((n) => Number.isInteger(n) && n >= 0 && n < 6),
          ),
        ]
      : [],
    supported: v?.supported === true,
    recallSupported: v?.recallSupported === true,
    independentRecall:
      finished && v?.independentRecall === true && v?.recallSupported !== true,
  };
}
export function advancePicnic(p: PicnicProgress, step: number): PicnicProgress {
  return step === p.next && step < 6 ? { ...p, next: step + 1 } : p;
}
export function picnicMemory(p: PicnicProgress) {
  return p.missed[0] ?? 5;
}
export const picnicItems = (p: PicnicProgress) => [
  { icon: "🧑‍🤝‍🧑", label: "A friend", ready: p.next >= 2 },
  { icon: "🍛", label: "Lunch", ready: p.next >= 4 },
  { icon: "🍈", label: "Fruit", ready: p.next >= 6 },
];
export const SECRET_LESSONS: Record<
  string,
  { scene: string; invitation: string }
> = {
  "cat-parade": {
    scene: "first-hello",
    invitation: "The cats lead you to Mali’s café. Say hello to a new friend.",
  },
  "tiny-door": {
    scene: "introduce-yourself",
    invitation:
      "A tiny visitor book! Practise introducing yourself before you add your name.",
  },
  bottle: {
    scene: "directions",
    invitation:
      "A traveller left a route in this bottle. Practise asking the way.",
  },
  "paper-boat": {
    scene: "songthaew",
    invitation: "Where will you travel next? Ask about getting around.",
  },
  fireflies: {
    scene: "meet-parents",
    invitation:
      "The lights lead towards a family home. Practise greeting an older guest.",
  },
  orchard: {
    scene: "fruit-market",
    invitation:
      "Your picnic could use some fruit. Ask the price and choose how much.",
  },
  shell: {
    scene: "seafood-market",
    invitation:
      "Listen to the coast, then practise ordering at the seafood market.",
  },
  turtle: {
    scene: "island-ferry",
    invitation:
      "A little traveller heads for the water. Find your own ferry route.",
  },
  book: {
    scene: "en-first-hello",
    invitation:
      "The book begins with a greeting. Try meeting someone in English.",
  },
  rainbow: {
    scene: "en-weekend-rehearsal",
    invitation: "A new visitor is crossing the bridge. Help them settle in.",
  },
};
