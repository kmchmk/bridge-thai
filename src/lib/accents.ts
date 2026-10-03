import { z } from "zod";
import au from "@/content/accents/au.json";
import uk from "@/content/accents/uk.json";
import us from "@/content/accents/us.json";

export const ACCENT_IDS = ["us", "uk", "au"] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

/** An English accent pack: the spoken accent (TTS prompt) plus the words that differ between countries. */
export const accentSchema = z.object({
  id: z.enum(ACCENT_IDS),
  label: z.string(),
  short: z.string(),
  /** Thai name and hint, for the Thai UI. */
  labelTh: z.string(),
  hintTh: z.string(),
  flag: z.string(),
  hint: z.string(),
  /** Used in running text: "Real {speakers} speakers…". */
  speakers: z.string(),
  reviewed: z.boolean(),
  /** Default TTS style prompt (admin-editable). */
  accentHint: z.string(),
  /** BCP-47 tag for the browser-speech fallback. */
  lang: z.string(),
  lexicon: z.record(z.string(), z.string()),
});

export type AccentPack = z.infer<typeof accentSchema>;

export const ACCENTS: AccentPack[] = [us, uk, au].map((a) => accentSchema.parse(a));

const byId = new Map(ACCENTS.map((a) => [a.id, a]));
export const getAccent = (id: AccentId): AccentPack => byId.get(id) ?? byId.get("us")!;
export const isAccent = (v: string): v is AccentId => byId.has(v as AccentId);

/** Thai meaning of every accent-dependent slot, shown in the "why these words?" notes. */
export const SLOT_MEANING: Record<string, string> = {
  hello: "คำทักทายแบบสบาย ๆ",
  noProblem: "ไม่เป็นไร / ยินดี",
  toGoAsk: "ถามว่าจะทานที่ร้านหรือห่อกลับ",
  togo: "ห่อกลับบ้าน",
  price: "ราคากาแฟ (สกุลเงินต่างกัน)",
  priceShirt: "ราคาเสื้อ (สกุลเงินต่างกัน)",
  bill: "ใบเสร็จ / เช็กบิล",
  fries: "เฟรนช์ฟรายส์ (มันฝรั่งทอด)",
  elevator: "ลิฟต์",
  shop: "ร้านค้า",
};
