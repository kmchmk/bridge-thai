import { getRegion } from "@/lib/regions";
import type { Gender, Region, Relationship, Word } from "./types";

// Central Thai defaults. Region packs (src/content/regions/*.json) override any of these.
// Every entry is a draft awaiting native-speaker review (see docs/CONTENT.md).

const w = (th: string, rom: string): Word => ({ th, rom });

/** Relationship of the speaker to the listener, seen from the *other* side. */
export const INVERSE: Record<Relationship, Relationship> = {
  friend: "friend",
  older: "younger",
  elder: "child",
  younger: "older",
  child: "elder",
  stranger: "stranger",
};

/** {I} — how the speaker refers to themself, by (relationship, speaker gender). */
export const SELF: Record<Relationship, Record<Gender, Word>> = {
  friend: { male: w("เรา", "rao"), female: w("เรา", "rao") },
  older: { male: w("ผม", "phǒm"), female: w("ฉัน", "chǎn") },
  elder: { male: w("ผม", "phǒm"), female: w("หนู", "nǔu") },
  younger: { male: w("พี่", "phîi"), female: w("พี่", "phîi") },
  child: { male: w("ลุง", "lung"), female: w("ป้า", "bpâa") },
  stranger: { male: w("ผม", "phǒm"), female: w("ฉัน", "chǎn") },
};

/** {YOU} — how the speaker addresses the listener, by (relationship, listener gender). */
export const ADDRESS: Record<Relationship, Record<Gender, Word>> = {
  friend: { male: w("นาย", "naai"), female: w("เธอ", "thəə") },
  older: { male: w("พี่", "phîi"), female: w("พี่", "phîi") },
  elder: { male: w("ลุง", "lung"), female: w("ป้า", "bpâa") },
  younger: { male: w("น้อง", "nɔ́ɔng"), female: w("น้อง", "nɔ́ɔng") },
  child: { male: w("หลาน", "lǎan"), female: w("หลาน", "lǎan") },
  stranger: { male: w("คุณ", "khun"), female: w("คุณ", "khun") },
};

export const selfWord = (rel: Relationship, g: Gender, region: Region): Word =>
  getRegion(region).pronouns?.self?.[rel]?.[g] ?? SELF[rel][g];

export const addressWord = (rel: Relationship, g: Gender, region: Region): Word =>
  getRegion(region).pronouns?.address?.[rel]?.[g] ?? ADDRESS[rel][g];

const POLITE: Relationship[] = ["older", "elder", "stranger"];
export const isPolite = (r: Relationship) => POLITE.includes(r);

/** {P} statement particle / {Q} question particle, by (relationship, speaker gender, region). */
export function particles(
  relationship: Relationship,
  speaker: Gender,
  region: Region,
): { statement: Word; question: Word } {
  const pack = getRegion(region);
  if (isPolite(relationship)) {
    const regional = pack.particles?.polite?.[speaker];
    if (regional) return regional;
    return speaker === "male"
      ? { statement: w("ครับ", "khráp"), question: w("ครับ", "khráp") }
      : { statement: w("ค่ะ", "khâ"), question: w("คะ", "khá") };
  }
  const casual = pack.particles?.casual;
  if (casual) return casual;
  if (relationship === "friend") return { statement: w("นะ", "ná"), question: w("", "") };
  // younger / child: warm, non-polite
  return speaker === "female"
    ? { statement: w("จ้ะ", "jâ"), question: w("", "") }
    : { statement: w("นะ", "ná"), question: w("", "") };
}

/** {HI} greeting: casual for friends, polite otherwise. */
export function greeting(relationship: Relationship, speaker: Gender, region: Region): Word {
  if (relationship === "friend") return w("หวัดดี", "wàt-dii");
  const p = particles(relationship, speaker, region).statement;
  return w(`สวัสดี${p.th}`, `sà-wàt-dii ${p.rom}`);
}

/**
 * Vocabulary slots used by scene templates ({eat}, {what}, …). Central Thai here;
 * a region pack replaces only the words that really differ in that dialect.
 */
export const CENTRAL_LEXICON: Record<string, Word> = {
  eat: w("กิน", "gin"),
  delicious: w("อร่อย", "à-rɔ̀i"),
  not: w("ไม่", "mâi"),
  much: w("มาก", "mâak"),
  what: w("อะไร", "à-rai"),
  where: w("ที่ไหน", "thîi-nǎi"),
  gowhere: w("ไปไหน", "bpai-nǎi"),
  howmuch: w("เท่าไหร่", "thâo-rài"),
  mai: w("ไหม", "mǎi"),
  speak: w("พูด", "phûut"),
  market: w("ตลาด", "dtà-làat"),
  fun: w("สนุก", "sà-nùk"),
  headache: w("ปวดหัว", "bpùuat-hǔa"),
};

export const lexiconFor = (region: Region): Record<string, Word> => ({ ...CENTRAL_LEXICON, ...getRegion(region).lexicon });
