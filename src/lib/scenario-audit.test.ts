import { describe, it, expect } from "vitest";
import { SCENES } from "./content";
import { EN_SCENES, buildEnSteps, FORMALITIES } from "./english";
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
});
