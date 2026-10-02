import { seeded } from "@/lib/game";
import type { AdventureSave, Mission } from "./model";
export type PracticeMode = "listen" | "respond" | "build";
export interface PracticeCard {
  id: string;
  mission: Mission;
  step: Mission["steps"][number];
  mode: PracticeMode;
}
/** Put phrases previously missed first; shuffle the rest for a different revisit. */
export function practiceDeck(
  missions: Mission[],
  save: AdventureSave,
  seed: string,
): PracticeCard[] {
  const rand = seeded(seed);
  const cards = missions
    .filter((m) => save.completed.includes(m.id))
    .flatMap((m) =>
      m.steps.map((step, i) => ({
        id: `${m.id}:${i}`,
        mission: m,
        step,
        weight:
          (save.practice[`${m.id}:${i}`]?.attempts ?? 0) -
          (save.practice[`${m.id}:${i}`]?.successes ?? 0),
        random: rand(),
      })),
    );
  cards.sort((a, b) => b.weight - a.weight || a.random - b.random);
  return cards
    .slice(0, 6)
    .map((c, i) => ({
      ...c,
      mode: (["listen", "respond", "build"] as const)[i % 3],
    }));
}
export function rememberPractice(
  save: AdventureSave,
  id: string,
  success: boolean,
): AdventureSave {
  const previous = save.practice[id] ?? { attempts: 0, successes: 0 };
  return {
    ...save,
    practice: {
      ...save.practice,
      [id]: {
        attempts: previous.attempts + 1,
        successes: previous.successes + (success ? 1 : 0),
      },
    },
    coins: save.coins + (success && previous.successes === 0 ? 2 : 0),
  };
}
/** Preserve every character, including spaces, when assembling a sentence. */
export function phraseChunks(text: string): string[] {
  const pieces = text
    .split(
      /(ขอบคุณ|สบายดี|ยินดีที่ได้รู้จัก|ข้าวซอย|หนึ่งชาม|ผม|ฉัน|ครับ|ค่ะ|คะ|จ้ะ|ไม่|เผ็ด|มาก|เท่าไหร่|หนึ่งร้อยห้าสิบ)/,
    )
    .filter(Boolean);
  const chunks: string[] = [];
  for (const p of pieces) {
    if (/^\s+$/.test(p) && chunks.length) chunks[chunks.length - 1] += p;
    else chunks.push(p);
  }
  return chunks.length > 1 ? chunks : text.split(/(?<=\s)/).filter(Boolean);
}
