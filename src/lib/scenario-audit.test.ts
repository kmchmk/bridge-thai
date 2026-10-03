import { describe, it, expect } from "vitest";
import { SCENES } from "./content";
import { EN_SCENES, buildEnSteps, FORMALITIES, genderedGloss } from "./english";
import { buildAtlasContent } from "./atlas/content";
import { buildSteps } from "./game";
const setup = {
  speakerGender: "female",
  listenerGender: "male",
  relationship: "stranger",
  region: "bangkok",
} as const;
describe("scenario text audit", () => {
  it("provides the actual English task in every accent and formality, including rehearsals", () => {
    for (const scene of EN_SCENES)
      for (const formality of FORMALITIES)
        for (const accent of ["us", "uk", "au"] as const) {
          const steps = buildEnSteps(scene, { ...setup, formality, accent });
          for (const step of steps) {
            expect(step.promptEn).toBeTruthy();
            expect(step.promptEn).not.toMatch(/[{}\u0E00-\u0E7F]/);
            const correct = step.choices.find((c) => c.correct)!;
            expect(
              step.choices.filter((c) => !c.correct).map((c) => c.line.text),
            ).not.toContain(correct.line.text);
          }
        }
    for (const encounters of Object.values(buildAtlasContent().english))
      for (const step of encounters.at(-1)!.steps)
        expect(step.promptEn).not.toMatch(/[{}\u0E00-\u0E7F]/);
  });
  it("does not penalize a polite greeting to a friend", () => {
    const step = buildSteps(
      SCENES.find((s) => s.id === "first-hello")!,
      { ...setup, relationship: "friend" },
    )[0];
    expect(step.choices.find((c) => c.id === "too-stiff")?.correct).toBe(true);
  });
  it("removes contextually valid fragments from negative grammar examples", () => {
    const ambiguous = [
      "One latte.",
      "Cold coffee, please.",
      "Straight, turn left, correct?",
      "Breakfast what time?",
      "Can I try?",
      "Only water is okay.",
      "We are two.",
    ];
    for (const scene of EN_SCENES)
      for (const step of scene.steps)
        for (const wrong of step.wrong)
          expect(ambiguous).not.toContain(wrong.en);
    const latte = EN_SCENES.find((s) => s.id === "en-coffee-shop")!.steps[0];
    expect(latte.promptEn).toContain("one latte");
    expect(latte.wrong.find((w) => w.en.includes("two lattes"))?.why).toContain(
      "สอง",
    );
  });
  it("keeps tasting and refusing more food as separate dialogue turns", () => {
    const content = buildAtlasContent().picnic.female.find(
      (m) => m.id === "noodles",
    )!;
    expect(content.riceNpc?.text).toBe("อร่อยไหมครับ");
    expect(
      content.steps[2].choices.find((c) => c.id === "ok")?.line.gloss,
    ).toContain("delicious");
    expect(content.steps[3].npc.gloss).toContain("Anything else");
    expect(
      content.steps[3].choices.find((c) => c.id === "ok")?.line.text,
    ).toContain("ไม่เอาเพิ่มแล้ว");
  });
  it("keeps the formality choice meaningful: every step has a register mismatch for every formality", () => {
    for (const scene of EN_SCENES)
      for (const [i, step] of scene.steps.entries())
        for (const f of FORMALITIES)
          expect(
            step.wrong.some((w) => w.formality?.includes(f)),
            `${scene.id} step ${i + 1} has no register distractor for ${f}`,
          ).toBe(true);
    for (const formality of FORMALITIES)
      for (const step of buildEnSteps(EN_SCENES[0], { ...setup, formality, accent: "us" }))
        expect(
          step.choices.some((c) => !c.correct && /สถานการณ์นี้/.test(c.feedback ?? "")),
        ).toBe(true);
  });
  it("shows the Thai gloss with the particle of whoever speaks the line", () => {
    expect(genderedGloss("ได้ค่ะ/ครับ จะเอาร้อนหรือเย็น", "male")).toBe("ได้ครับ จะเอาร้อนหรือเย็น");
    expect(genderedGloss("แบบเย็นครับ/ค่ะ", "female")).toBe("แบบเย็นค่ะ");
    for (const scene of EN_SCENES)
      for (const gender of ["male", "female"] as const)
        for (const step of buildEnSteps(scene, { ...setup, speakerGender: gender, listenerGender: gender, formality: "neutral", accent: "uk" })) {
          expect(step.npc.gloss).not.toMatch(/ครับ\/ค่ะ|ค่ะ\/ครับ/);
          for (const c of step.choices) expect(c.line.gloss).not.toMatch(/ครับ\/ค่ะ|ค่ะ\/ครับ/);
        }
  });
  it("words the formal takeaway question naturally in each accent", () => {
    const step = (accent: "us" | "uk" | "au") =>
      buildEnSteps(EN_SCENES.find((s) => s.id === "en-coffee-shop")!, { ...setup, formality: "formal", accent })[2].npc.text;
    expect(step("us")).toBe("Will you be having it here, or would you like it to go?");
    expect(step("uk")).toBe("Will you be having it here, or would you prefer to take it away?");
    expect(step("au")).toBe("Will you be having it here, or would you like to take it away?");
  });
});
