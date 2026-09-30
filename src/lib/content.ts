import { z } from "zod";
import directions from "@/content/scenes/directions.json";
import emergency from "@/content/scenes/emergency.json";
import firstHello from "@/content/scenes/first-hello.json";
import floatingMarket from "@/content/scenes/floating-market.json";
import fruitMarket from "@/content/scenes/fruit-market.json";
import hotelCheckin from "@/content/scenes/hotel-checkin.json";
import introduceYourself from "@/content/scenes/introduce-yourself.json";
import islandFerry from "@/content/scenes/island-ferry.json";
import marketHaggling from "@/content/scenes/market-haggling.json";
import meetParents from "@/content/scenes/meet-parents.json";
import noodleStall from "@/content/scenes/noodle-stall.json";
import pharmacy from "@/content/scenes/pharmacy.json";
import restaurant from "@/content/scenes/restaurant.json";
import seafoodMarket from "@/content/scenes/seafood-market.json";
import somTam from "@/content/scenes/som-tam.json";
import songthaew from "@/content/scenes/songthaew.json";
import taxi from "@/content/scenes/taxi.json";
import { REGION_IDS } from "@/lib/register/types";

const line = z.object({ th: z.string().min(1), rom: z.string().min(1), en: z.string().min(1) });

export const sceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  blurb: z.string(),
  emoji: z.string(),
  /** Flipped to true once a native speaker has reviewed the scene. */
  reviewed: z.boolean(),
  /** Only offered in these regions (omit = everywhere). */
  regions: z.array(z.enum(REGION_IDS)).optional(),
  /** Only offered for these relationships (omit = any). */
  relationships: z.array(z.enum(["friend", "older", "elder", "younger", "stranger"])).optional(),
  steps: z
    .array(z.object({ npc: line, prompt: z.string(), you: line }))
    .min(1),
});

export type Scene = z.infer<typeof sceneSchema>;

export const SCENES: Scene[] = [firstHello, noodleStall, restaurant, marketHaggling, taxi, directions, introduceYourself, meetParents, hotelCheckin, pharmacy, emergency, songthaew, somTam, seafoodMarket, islandFerry, fruitMarket, floatingMarket].map((s) => sceneSchema.parse(s));

export const getScene = (id: string) => SCENES.find((s) => s.id === id);

/** Scenes offered for a setup: region- and relationship-specific ones only where they make sense. */
export const scenesFor = (setup: { region: string; relationship: string }) =>
  SCENES.filter(
    (s) =>
      (!s.regions || (s.regions as string[]).includes(setup.region)) &&
      (!s.relationships || (s.relationships as string[]).includes(setup.relationship)),
  );
