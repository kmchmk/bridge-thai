import type { StepView } from "@/lib/game";
import type { Gender, Setup } from "@/lib/register/types";

export type PlaceId = "friend" | "noodles" | "market";
export interface Mission {
  id: PlaceId;
  sceneId: string;
  name: string;
  role: string;
  title: string;
  description: string;
  reward: string;
  icon: string;
  color: string;
  setup: Setup;
  steps: StepView[];
}
export interface AdventureContent {
  male: Mission[];
  female: Mission[];
}
export interface AdventureSave {
  version: 1;
  gender: Gender;
  completed: PlaceId[];
  best: Partial<Record<PlaceId, number>>;
  discoveries: string[];
  journal: string[];
  coins: number;
  challengeBest: number;
  wallet: number;
  decorations: string[];
  meal: "noodles" | "rice";
  practice: Record<string, { attempts: number; successes: number }>;
  picnicSeen: boolean;
}
export const SAVE_KEY = "bt_adventure_v1";
export const freshSave = (): AdventureSave => ({
  version: 1,
  gender: "female",
  completed: [],
  best: {},
  discoveries: [],
  journal: [],
  coins: 0,
  challengeBest: 0,
  wallet: 400,
  decorations: [],
  meal: "noodles",
  practice: {},
  picnicSeen: false,
});
export function parseSave(raw: string | null): AdventureSave {
  if (!raw) return freshSave();
  try {
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !["male", "female"].includes(data.gender) ||
      !Array.isArray(data.completed) ||
      !Array.isArray(data.discoveries) ||
      !Array.isArray(data.journal)
    )
      return freshSave();
    const ids: PlaceId[] = ["friend", "noodles", "market"];
    return {
      ...freshSave(),
      gender: data.gender,
      completed: ids.filter((id) => data.completed.includes(id)),
      best: Object.fromEntries(
        ids
          .filter(
            (id) =>
              Number.isInteger(data.best?.[id]) &&
              data.best[id] >= 0 &&
              data.best[id] <= 3,
          )
          .map((id) => [id, data.best[id]]),
      ),
      discoveries: DISCOVERIES.map((d) => d.id).filter((id) =>
        data.discoveries.includes(id),
      ),
      journal: data.journal
        .filter((x: unknown) => typeof x === "string")
        .slice(0, 100),
      coins: Number.isFinite(data.coins)
        ? Math.max(0, Math.min(10000, data.coins))
        : 0,
      challengeBest: Number.isInteger(data.challengeBest)
        ? Math.max(0, Math.min(6, data.challengeBest))
        : 0,
      wallet: Number.isFinite(data.wallet)
        ? Math.max(0, Math.min(400, data.wallet))
        : 400,
      decorations: ["lanterns", "flowers", "cushions"].filter((id) =>
        data.decorations?.includes(id),
      ),
      meal: data.meal === "rice" ? "rice" : "noodles",
      practice: Object.fromEntries(
        Object.entries(data.practice ?? {})
          .filter(([key, v]) => {
            const value = v as { attempts: number; successes: number };
            return (
              key.length < 120 &&
              Number.isInteger(value?.attempts) &&
              Number.isInteger(value?.successes) &&
              value.attempts >= 0 &&
              value.successes >= 0 &&
              value.successes <= value.attempts
            );
          })
          .slice(0, 100)
          .map(([key, v]) => {
            const value = v as { attempts: number; successes: number };
            return [
              key,
              { attempts: value.attempts, successes: value.successes },
            ];
          }),
      ),
      picnicSeen: data.picnicSeen === true,
      version: 1,
    };
  } catch {
    return freshSave();
  }
}
/** Coins are a one-time souvenir reward, never farmed by replaying. */
export function finishMission(
  save: AdventureSave,
  mission: Mission,
  mistakes: number,
): AdventureSave {
  const first = !save.completed.includes(mission.id);
  const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
  return {
    ...save,
    completed: first ? [...save.completed, mission.id] : save.completed,
    best: {
      ...save.best,
      [mission.id]: Math.max(save.best[mission.id] ?? 0, stars),
    },
    coins: save.coins + (first ? 30 : 0),
    wallet:
      save.wallet -
      (first
        ? mission.id === "noodles"
          ? 50
          : mission.id === "market"
            ? 150
            : 0
        : 0),
    journal: [
      ...new Set([
        ...save.journal,
        ...mission.steps.map(
          (s) => s.choices.find((c) => c.correct)!.line.text,
        ),
      ]),
    ],
  };
}
export const DISCOVERIES = [
  {
    id: "cat",
    word: "แมว",
    roman: "mɛɛo",
    meaning: "cat",
    clue: "A sleepy local is waiting beside the café.",
    icon: "🐈",
  },
  {
    id: "flower",
    word: "ดอกไม้",
    roman: "dɔ̀ɔk-máai",
    meaning: "flower",
    clue: "Something bright grows near the bridge.",
    icon: "🌺",
  },
  {
    id: "water",
    word: "น้ำ",
    roman: "náam",
    meaning: "water",
    clue: "Watch the canal. What do you see?",
    icon: "💧",
  },
];

export const DECORATIONS = [
  {
    id: "lanterns",
    name: "Festival lanterns",
    icon: "🏮",
    cost: 25,
    description: "A warm glow over the picnic garden.",
  },
  {
    id: "flowers",
    name: "A flower garden",
    icon: "🌸",
    cost: 20,
    description: "A little colour along the canal.",
  },
  {
    id: "cushions",
    name: "Picnic cushions",
    icon: "🧺",
    cost: 15,
    description: "A comfy place for your new friends.",
  },
];
export function buyDecoration(save: AdventureSave, id: string): AdventureSave {
  const item = DECORATIONS.find((d) => d.id === id);
  if (!item || save.decorations.includes(id) || save.coins < item.cost)
    return save;
  return {
    ...save,
    coins: save.coins - item.cost,
    decorations: [...save.decorations, id],
  };
}
