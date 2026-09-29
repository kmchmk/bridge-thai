import { z } from "zod";
import firstHello from "@/content/scenes/first-hello.json";
import noodleStall from "@/content/scenes/noodle-stall.json";

const line = z.object({ th: z.string().min(1), rom: z.string().min(1), en: z.string().min(1) });

export const sceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  blurb: z.string(),
  emoji: z.string(),
  /** Flipped to true once a native speaker has reviewed the scene. */
  reviewed: z.boolean(),
  steps: z
    .array(z.object({ npc: line, prompt: z.string(), you: line }))
    .min(1),
});

export type Scene = z.infer<typeof sceneSchema>;

export const SCENES: Scene[] = [firstHello, noodleStall].map((s) => sceneSchema.parse(s));

export const getScene = (id: string) => SCENES.find((s) => s.id === id);
