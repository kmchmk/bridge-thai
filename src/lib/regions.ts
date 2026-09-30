import { z } from "zod";
import bangkok from "@/content/regions/bangkok.json";
import chiangmai from "@/content/regions/chiangmai.json";
import east from "@/content/regions/east.json";
import isan from "@/content/regions/isan.json";
import phuket from "@/content/regions/phuket.json";
import south from "@/content/regions/south.json";
import west from "@/content/regions/west.json";
import { REGION_IDS, type Region } from "@/lib/register/types";

const word = z.object({ th: z.string(), rom: z.string() });
const line = z.object({ th: z.string(), rom: z.string(), en: z.string() });
const pair = z.object({ statement: word, question: word });
const genderWords = z.object({ male: word.optional(), female: word.optional() });
const REL = ["friend", "older", "elder", "younger", "child", "stranger"] as const;
const byRelationship = z.partialRecord(z.enum(REL), genderWords);

/**
 * A region "pack": everything that changes when the learner picks a place — vocabulary, particles,
 * pronouns — plus the audio hints. Editable JSON in src/content/regions/ so a native speaker can review it.
 */
export const regionPackSchema = z.object({
  id: z.enum(REGION_IDS),
  label: z.string(),
  area: z.string(),
  hint: z.string(),
  /** How to refer to the people who speak it in running text: "Real {speakers} speakers…". */
  speakers: z.string(),
  /** standard = Central; dialect = own vocabulary/particles; accent = Central vocabulary, regional accent only. */
  kind: z.enum(["standard", "dialect", "accent"]),
  dialect: z.enum(["central", "north", "isan", "south"]),
  reviewed: z.boolean(),
  notes: z.string(),
  /** Default TTS style prompt for the accent (used only when the admin switches the region's audio to "accent hint"). */
  accentHint: z.string(),
  sample: z.object({ male: line, female: line }),
  lexicon: z.record(z.string(), word),
  particles: z
    .object({
      polite: z.object({ male: pair.optional(), female: pair.optional() }).optional(),
      casual: pair.optional(),
    })
    .optional(),
  pronouns: z.object({ self: byRelationship.optional(), address: byRelationship.optional() }).optional(),
});

export type RegionPack = z.infer<typeof regionPackSchema>;

export const REGION_PACKS: RegionPack[] = [bangkok, chiangmai, isan, south, phuket, east, west].map((p) => regionPackSchema.parse(p));

const byId = new Map(REGION_PACKS.map((p) => [p.id, p]));
export const getRegion = (id: Region): RegionPack => byId.get(id) ?? byId.get("bangkok")!;
export const isRegion = (v: string): v is Region => byId.has(v as Region);
