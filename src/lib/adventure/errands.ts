import type { AdventureContent, AdventureSave, PlaceId } from "./model";
import type { LineView } from "@/lib/game";
import type { Gender } from "@/lib/register/types";
export type ItemId = "noodles" | "rice" | "scarf";
export interface Errand {
  id: string;
  challenge: boolean;
  receiver: PlaceId;
  name: string;
  source: PlaceId;
  item: ItemId;
  request: LineView;
  voice: Gender;
  price: number;
  paymentLine: LineView;
  paymentVoice: Gender;
  practiceId: string;
}
export const ITEMS = [
  { id: "noodles", name: "ข้าวซอย", meaning: "khao soi", icon: "🍜" },
  { id: "rice", name: "ผัดกะเพรา", meaning: "pad kra pao", icon: "🍛" },
  { id: "scarf", name: "ผ้าพันคอ", meaning: "woven scarf", icon: "🧣" },
] as const;
export function nextErrand(
  content: AdventureContent,
  save: AdventureSave,
): Errand {
  const variants: { receiver: PlaceId; item: ItemId }[] = [
    { receiver: "friend", item: "noodles" },
    { receiver: "market", item: "rice" },
    { receiver: "noodles", item: "scarf" },
    { receiver: "friend", item: "rice" },
    { receiver: "market", item: "noodles" },
  ];
  const candidate = variants[save.errands % variants.length];
  const receiver = content.female.find((m) => m.id === candidate.receiver)!;
  const course = content[receiver.setup.listenerGender];
  const source: PlaceId = candidate.item === "scarf" ? "market" : "noodles";
  const mission = course.find((m) => m.id === source)!;
  const request =
    candidate.item === "scarf"
      ? mission.steps[2].choices.find((c) => c.id === "ok")!.line
      : mission.steps[0].choices.find(
          (c) => c.id === (candidate.item === "rice" ? "meal-rice" : "ok"),
        )!.line;
  const challenge = save.errands >= variants.length;
  // Later rounds use prepared natural-pace recordings and alternate market prices.
  const marketPrice = Math.floor(save.errands / variants.length) % 3;
  const paymentLine =
    candidate.item === "scarf" && challenge
      ? mission.steps[marketPrice === 1 ? 2 : marketPrice === 2 ? 1 : 2].npc
      : candidate.item === "scarf"
        ? request
        : mission.steps[4].npc;
  const price =
    candidate.item === "scarf"
      ? challenge
        ? marketPrice === 2
          ? 200
          : 180
        : 150
      : 50;
  return {
    ...candidate,
    challenge,
    id: `${candidate.receiver}:${candidate.item}`,
    name: receiver.name,
    source,
    price,
    request: candidate.item === "scarf" && challenge ? paymentLine : request,
    voice:
      candidate.item === "scarf" && challenge
        ? mission.setup.listenerGender
        : receiver.setup.listenerGender,
    paymentLine,
    paymentVoice:
      candidate.item === "scarf" && !challenge
        ? receiver.setup.listenerGender
        : mission.setup.listenerGender,
    practiceId: candidate.item === "scarf" ? "market:2" : "noodles:0",
  };
}
export function finishErrand(
  save: AdventureSave,
  errand: Errand,
  independent: boolean,
): AdventureSave {
  const first = !save.postcards.includes(errand.id);
  return {
    ...save,
    errands: save.errands + 1,
    postcards: first ? [...save.postcards, errand.id] : save.postcards,
    independentErrands: independent
      ? [...new Set([...save.independentErrands, errand.id])]
      : save.independentErrands,
    coins:
      save.coins +
      (first
        ? independent
          ? 10
          : 5
        : independent && !save.independentErrands.includes(errand.id)
          ? 5
          : 0),
  };
}
