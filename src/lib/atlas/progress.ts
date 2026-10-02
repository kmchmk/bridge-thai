import {
  freshSave,
  parseSave,
  type AdventureSave,
} from "@/lib/adventure/model";
import { LOCATIONS, QUESTS, SECRETS } from "./catalog";
export const ATLAS_KEY = "bt_atlas_v1";
export interface AtlasSave {
  chapter: AdventureSave;
  decorations: string[];
  version: 1;
  completed: string[];
  independent: string[];
  stars: Record<string, number>;
  secrets: string[];
  coins: number;
  welcomeSeen: boolean;
}
export const freshAtlas = (): AtlasSave => ({
  chapter: freshSave(),
  decorations: [],
  version: 1,
  completed: [],
  independent: [],
  stars: {},
  secrets: [],
  coins: 0,
  welcomeSeen: false,
});
export function parseAtlas(raw: string | null): AtlasSave {
  try {
    const d = JSON.parse(raw ?? "null");
    if (d?.version !== 1) return freshAtlas();
    const allowed = LOCATIONS.map((l) => l.id);
    const completed = allowed.filter(
      (id) => Array.isArray(d.completed) && d.completed.includes(id),
    );
    return {
      chapter: parseSave(JSON.stringify(d.chapter)),
      decorations: ["lanterns", "flowers", "cushions", "fish"].filter(
        (id) => Array.isArray(d.decorations) && d.decorations.includes(id),
      ),
      version: 1,
      completed,
      independent: completed.filter(
        (id) => Array.isArray(d.independent) && d.independent.includes(id),
      ),
      stars: Object.fromEntries(
        completed.map((id) => [
          id,
          Number.isInteger(d.stars?.[id])
            ? Math.max(1, Math.min(3, d.stars[id]))
            : 1,
        ]),
      ),
      secrets: SECRETS.map((s) => s.id).filter(
        (id) => Array.isArray(d.secrets) && d.secrets.includes(id),
      ),
      coins: Number.isInteger(d.coins)
        ? Math.max(0, Math.min(10000, d.coins))
        : 0,
      welcomeSeen: d.welcomeSeen === true,
    };
  } catch {
    return freshAtlas();
  }
}
export function completeLocation(
  save: AtlasSave,
  id: string,
  mistakes: number,
  supported: boolean,
): AtlasSave {
  if (!LOCATIONS.some((l) => l.id === id)) return save;
  const first = !save.completed.includes(id),
    independent = mistakes === 0 && !supported;
  const updated = {
    ...save,
    completed: first ? [...save.completed, id] : save.completed,
    independent: independent
      ? [...new Set([...save.independent, id])]
      : save.independent,
    stars: {
      ...save.stars,
      [id]: Math.max(
        save.stars[id] ?? 0,
        mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1,
      ),
    },
    coins:
      save.coins +
      (first ? 10 : independent && !save.independent.includes(id) ? 5 : 0),
  };
  const newlyCompleted = QUESTS.filter(
    (q) =>
      q.stops.every((s) => updated.completed.includes(s)) &&
      !q.stops.every((s) => save.completed.includes(s)),
  );
  return { ...updated, coins: updated.coins + newlyCompleted.length * 15 };
}
export function discoverSecret(save: AtlasSave, id: string): AtlasSave {
  return !SECRETS.some((s) => s.id === id) || save.secrets.includes(id)
    ? save
    : { ...save, secrets: [...save.secrets, id], coins: save.coins + 3 };
}
export const nextStop = (save: AtlasSave, course: "th" | "en") =>
  QUESTS.filter((q) =>
    course === "en" ? q.id === "english" : q.id !== "english",
  )
    .flatMap((q) => q.stops)
    .find((id) => !save.completed.includes(id));
