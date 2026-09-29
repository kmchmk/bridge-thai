import { describe, expect, it } from "vitest";
import { SCENES } from "../content";
import { distractorsFor, explain, renderLearner, renderNpc } from "./engine";
import type { Setup } from "./types";

const base: Setup = { speakerGender: "male", listenerGender: "female", relationship: "friend", region: "bangkok" };
const line = { th: "{HI} {I}ขอน้ำ{P}", rom: "{HI} {I} khɔ̌ɔ nám {P}", en: "Water please." };

describe("register engine", () => {
  it("male speaker → female friend: casual", () => {
    expect(renderLearner(line, base).th).toBe("หวัดดี เราขอน้ำนะ");
  });

  it("male speaker → elder: ผม + ครับ", () => {
    expect(renderLearner(line, { ...base, relationship: "elder" }).th).toBe("สวัสดีครับ ผมขอน้ำครับ");
  });

  it("female speaker → elder: หนู + ค่ะ", () => {
    const s = { ...base, speakerGender: "female", relationship: "elder" } as Setup;
    expect(renderLearner(line, s).th).toBe("สวัสดีค่ะ หนูขอน้ำค่ะ");
  });

  it("questions use คะ for female speakers, ครับ for male", () => {
    const q = { th: "เท่าไหร่{Q}", rom: "thâo-rài {Q}", en: "How much?" };
    expect(renderLearner(q, { ...base, relationship: "stranger" }).th).toBe("เท่าไหร่ครับ");
    expect(renderLearner(q, { ...base, speakerGender: "female", relationship: "stranger" }).th).toBe("เท่าไหร่คะ");
  });

  it("Chiang Mai swaps in northern particle and vocab", () => {
    const l = { th: "{delicious}{much}{P}", rom: "{delicious} {much} {P}", en: "Very tasty" };
    expect(renderLearner(l, { ...base, relationship: "stranger", region: "chiangmai" }).th).toBe("ลำหลายเจ้า");
  });

  it("NPC speaks with reversed roles", () => {
    // Learner is a male speaking to a female elder → NPC is a female elder speaking to a young man.
    const s = { ...base, relationship: "elder" } as Setup;
    const npc = { th: "{I}ให้{YOU}{P}", rom: "x", en: "x" };
    // An older woman talking down to a young person uses the warm จ้ะ, not polite ค่ะ.
    expect(renderNpc(npc, s).th).toBe("ป้าให้หลานจ้ะ");
  });

  it("distractors differ from the correct answer and from each other", () => {
    const s = { ...base, relationship: "elder" } as Setup;
    const correct = renderLearner(line, s).th;
    const d = distractorsFor(line, s);
    expect(d.map((x) => x.kind)).toEqual(["too-casual", "wrong-gender"]);
    const all = [correct, ...d.map((x) => x.line.th)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("explain() covers pronoun, address and particle", () => {
    expect(explain(base).map((n) => n.slot)).toEqual(["I", "YOU", "P"]);
  });

  it("every scene renders for every setup with no unresolved slots", () => {
    const genders = ["male", "female"] as const;
    const rels = ["friend", "older", "elder", "younger", "stranger"] as const;
    const regions = ["bangkok", "chiangmai"] as const;
    for (const scene of SCENES)
      for (const sg of genders) for (const lg of genders) for (const r of rels) for (const region of regions) {
        const setup: Setup = { speakerGender: sg, listenerGender: lg, relationship: r, region };
        for (const step of scene.steps) {
          for (const out of [renderLearner(step.you, setup), renderNpc(step.npc, setup)]) {
            expect(out.th).not.toMatch(/[{}]/);
            expect(out.rom).not.toMatch(/[{}]/);
          }
        }
      }
  });
});
