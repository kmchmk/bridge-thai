import { z } from "zod";
import { REGION_PACKS } from "./regions";
import { REGION_IDS, type Setup } from "./register/types";

export const setupSchema = z.object({
  speakerGender: z.enum(["male", "female"]),
  listenerGender: z.enum(["male", "female"]),
  relationship: z.enum(["friend", "older", "elder", "younger", "stranger"]),
  region: z.enum(REGION_IDS),
});

export const DEFAULT_SETUP: Setup = {
  speakerGender: "male",
  listenerGender: "female",
  relationship: "friend",
  region: "bangkok",
};

export const RELATIONSHIP_OPTIONS: { value: Setup["relationship"]; label: string; hint: string }[] = [
  { value: "friend", label: "Friend", hint: "Same age, casual — a friend or classmate" },
  { value: "older", label: "Slightly older", hint: "A bit older — you'd call them พี่ (pîi)" },
  { value: "elder", label: "Elder", hint: "Much older — like a parent, teacher or boss" },
  { value: "younger", label: "Younger", hint: "Younger than you — you'd call them น้อง (nɔ́ɔng)" },
  { value: "stranger", label: "Stranger / service", hint: "Someone you don't know, or shop and hotel staff" },
];

export const REGION_OPTIONS: { value: Setup["region"]; label: string; hint: string }[] = REGION_PACKS.map((p) => ({
  value: p.id,
  label: p.label,
  hint: p.kind === "standard" ? `${p.hint} · recommended to start` : p.hint,
}));

type Params = Record<string, string | string[] | undefined>;

export function parseSetup(params: Params): Setup {
  const pick = (k: string) => (Array.isArray(params[k]) ? params[k]![0] : params[k]);
  const parsed = setupSchema.safeParse({
    speakerGender: pick("sg"),
    listenerGender: pick("lg"),
    relationship: pick("rel"),
    region: pick("region"),
  });
  return parsed.success ? parsed.data : DEFAULT_SETUP;
}

export function setupQuery(s: Setup): string {
  return new URLSearchParams({
    sg: s.speakerGender,
    lg: s.listenerGender,
    rel: s.relationship,
    region: s.region,
  }).toString();
}

export function describeSetup(s: Setup): string {
  const rel = RELATIONSHIP_OPTIONS.find((o) => o.value === s.relationship)!.label.toLowerCase();
  const region = REGION_OPTIONS.find((o) => o.value === s.region)!.label;
  return `${s.speakerGender} speaker → ${s.listenerGender} ${rel} · ${region}`;
}
