import { describe, expect, it } from "vitest";
import { SCENES } from "../content";
import { distractorsFor, explain, renderLearner, renderNpc } from "./engine";
import { REGION_IDS, type Setup } from "./types";

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

  it("North (Chiang Mai): women end with เจ้า, men with ครับ; northern vocabulary", () => {
    const l = { th: "{delicious}{much}{P}", rom: "{delicious} {much} {P}", en: "Very tasty" };
    const north = { ...base, relationship: "stranger", region: "chiangmai" } as Setup;
    expect(renderLearner(l, north).th).toBe("ลำนักครับ");
    expect(renderLearner(l, { ...north, speakerGender: "female" }).th).toBe("ลำนักเจ้า");
    const q = { th: "{what}{mai}", rom: "x", en: "x" };
    expect(renderLearner(q, north).th).toBe("อะหยังก่อ");
  });

  it("Isan: ข่อย/เจ้า pronouns, เด้อ particle, บ่ questions, แซ่บ", () => {
    const isan = { ...base, relationship: "friend", region: "isan" } as Setup;
    const l = { th: "{I}ว่า{delicious}{much}{P}", rom: "x", en: "x" };
    expect(renderLearner(l, isan).th).toBe("ข่อยว่าแซ่บหลายเด้อ");
    const q = { th: "{YOU}{gowhere}", rom: "x", en: "x" };
    expect(renderLearner(q, isan).th).toBe("เจ้าไปไส");
    expect(renderLearner({ th: "เอาเผ็ด{mai}", rom: "x", en: "x" }, isan).th).toBe("เอาเผ็ดบ่");
    // older female listener is เอื้อย, male is อ้าย
    const older = { ...base, relationship: "older", region: "isan" } as Setup;
    expect(renderLearner({ th: "{YOU}", rom: "x", en: "x" }, older).th).toBe("เอื้อย");
    expect(renderLearner({ th: "{YOU}", rom: "x", en: "x" }, { ...older, listenerGender: "male" }).th).toBe("อ้าย");
  });

  it("South and Phuket share southern vocabulary; East and West are accent-only", () => {
    const l = { th: "{delicious}{much} {speak}{mai} {market}", rom: "x", en: "x" };
    const south = { ...base, relationship: "stranger", region: "south" } as Setup;
    expect(renderLearner(l, south).th).toBe("หรอยจังหู้ แหลงม่าย หลาด");
    expect(renderLearner(l, { ...south, region: "phuket" }).th).toBe("หรอยจังหู้ แหลงม่าย หลาด");
    for (const region of ["east", "west"] as const)
      expect(renderLearner(l, { ...south, region }).th).toBe(renderLearner(l, { ...south, region: "bangkok" }).th);
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
    const regions = REGION_IDS;
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

import { REGION_PACKS, getRegion } from "../regions";
import { CENTRAL_LEXICON } from "./tables";

describe("region packs", () => {
  it("cover every region id, and only override known lexicon slots", () => {
    expect(REGION_PACKS.map((p) => p.id).sort()).toEqual([...REGION_IDS].sort());
    for (const p of REGION_PACKS) for (const slot of Object.keys(p.lexicon)) expect(CENTRAL_LEXICON).toHaveProperty(slot);
  });

  it("dialect packs override vocabulary, accent-only packs do not", () => {
    for (const p of REGION_PACKS) {
      if (p.kind === "dialect") expect(Object.keys(p.lexicon).length).toBeGreaterThan(3);
      if (p.kind !== "dialect") expect(Object.keys(p.lexicon)).toEqual([]);
    }
    expect(getRegion("bangkok").reviewed).toBe(true);
    expect(getRegion("chiangmai").reviewed).toBe(false);
  });

  it("follows the native reviewer's Northern words: เจ็บหัว and เต้าไหร่", () => {
    const north = { ...base, region: "chiangmai" as const };
    const l = { th: "{I}{headache}{P}", rom: "{I} {headache} {P}", en: "I have a headache." };
    expect(renderLearner(l, north).th).toContain("เจ็บหัว");
    expect(renderLearner(l, base).th).toContain("ปวดหัว"); // Central keeps ปวดหัว
    expect(renderLearner({ th: "{howmuch}", rom: "x", en: "x" }, north).th).toBe("เต้าไหร่");
    expect(renderLearner({ th: "{howmuch}", rom: "x", en: "x" }, base).th).toBe("เท่าไหร่");
  });
});
