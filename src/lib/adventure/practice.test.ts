import { describe, expect, it } from "vitest";
import { phraseChunks, practiceDeck, rememberPractice } from "./practice";
import { freshSave, type Mission } from "./model";
const missions = [
  { id: "friend", steps: Array.from({ length: 8 }, () => ({ choices: [] })) },
] as unknown as Mission[];
describe("adaptive practice", () => {
  it("preserves the exact Thai sentence when building phrases", () => {
    for (const phrase of [
      "สบายดีจ้ะ ขอบคุณจ้ะ แล้วเธอล่ะ",
      "ฉันขอข้าวซอยหนึ่งชามค่ะ",
      "หนึ่งร้อยห้าสิบค่ะ ได้ไหมคะ",
    ]) {
      expect(phraseChunks(phrase).join("")).toBe(phrase);
      expect(phraseChunks(phrase).length).toBeGreaterThan(1);
    }
  });
  it("prioritizes a missed phrase and varies later requests", () => {
    const save = {
      ...freshSave(),
      completed: ["friend"] as const,
      practice: { "friend:5": { attempts: 3, successes: 0 } },
    };
    const a = practiceDeck(
      missions,
      { ...save, completed: [...save.completed] },
      "first",
    );
    const b = practiceDeck(
      missions,
      { ...save, completed: [...save.completed] },
      "next",
    );
    expect(a[0].id).toBe("friend:5");
    expect(b[0].id).toBe("friend:5");
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
    expect(new Set(a.map((c) => c.mode)).size).toBe(3);
  });
  it("awards first recall once, and tracks subsequent misses", () => {
    const first = rememberPractice(freshSave(), "friend:0", true);
    const again = rememberPractice(first, "friend:0", true);
    const miss = rememberPractice(again, "friend:0", false);
    expect(first.coins).toBe(2);
    expect(again.coins).toBe(2);
    expect(miss.practice["friend:0"]).toEqual({ attempts: 3, successes: 2 });
  });
});
