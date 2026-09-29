import type { Gender, Region, Relationship, Word } from "./types";

// NOTE: every entry here is a draft awaiting native-speaker review (see docs/CONTENT.md).

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

const POLITE: Relationship[] = ["older", "elder", "stranger"];
export const isPolite = (r: Relationship) => POLITE.includes(r);

/** {P} statement particle / {Q} question particle, by (relationship, speaker gender, region). */
export function particles(
  relationship: Relationship,
  speaker: Gender,
  region: Region,
): { statement: Word; question: Word } {
  if (isPolite(relationship)) {
    if (region === "chiangmai") {
      // Northern polite particle used by both genders. Draft — needs review.
      return { statement: w("เจ้า", "jâo"), question: w("เจ้า", "jâo") };
    }
    return speaker === "male"
      ? { statement: w("ครับ", "khráp"), question: w("ครับ", "khráp") }
      : { statement: w("ค่ะ", "khâ"), question: w("คะ", "khá") };
  }
  if (relationship === "friend") {
    return { statement: w("นะ", "ná"), question: w("", "") };
  }
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

/** Region-dependent vocabulary. `cm` overrides are drafts awaiting review. */
export const LEXICON: Record<string, { bangkok: Word; chiangmai: Word }> = {
  eat: { bangkok: w("กิน", "gin"), chiangmai: w("กิ๋น", "gǐn") },
  delicious: { bangkok: w("อร่อย", "à-rɔ̀i"), chiangmai: w("ลำ", "lam") },
  not: { bangkok: w("ไม่", "mâi"), chiangmai: w("บ่", "bɔ̀") },
  much: { bangkok: w("มาก", "mâak"), chiangmai: w("หลาย", "lǎai") },
};
