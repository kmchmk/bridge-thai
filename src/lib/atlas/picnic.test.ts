import { describe, it, expect } from "vitest";
import {
  advancePicnic,
  freshPicnic,
  parsePicnic,
  PICNIC_STEPS,
  picnicItems,
  picnicMemory,
  SECRET_LESSONS,
} from "./picnic";
import { freshAtlas, parseAtlas } from "./progress";
import { buildAtlasContent } from "./content";
import { LOCATIONS, SECRETS } from "./catalog";
import { isKnownLine } from "@/lib/tts/allowlist";
describe("connected picnic", () => {
  it("migrates older saves without inventing a completed story", () => {
    const old = {
      ...freshAtlas(),
      picnic: undefined,
      completed: ["first-hello"],
    };
    const migrated = parseAtlas(JSON.stringify(old));
    expect(migrated.picnic).toEqual(freshPicnic());
    expect(migrated.completed).toEqual(["first-hello"]);
  });
  it("packs each item only after its two exchanges and ignores duplicate/out-of-order actions", () => {
    let p = freshPicnic();
    expect(advancePicnic(p, 2)).toBe(p);
    p = advancePicnic(p, 0);
    expect(advancePicnic(p, 0)).toBe(p);
    expect(picnicItems(p).filter((i) => i.ready)).toHaveLength(0);
    for (let i = 1; i < 6; i++) p = advancePicnic(p, i);
    expect(picnicItems(p).every((i) => i.ready)).toBe(true);
    expect(p.finished).toBe(false);
  });
  it("retains interrupted progress and brings back the missed phrase", () => {
    const p = parsePicnic({
      next: 4,
      missed: [2, 2, -1, 50],
      supported: true,
      finished: true,
    });
    expect(p.next).toBe(4);
    expect(p.finished).toBe(false);
    expect(picnicMemory(p)).toBe(2);
    expect(
      parsePicnic({
        next: 6,
        finished: true,
        independentRecall: true,
        recallSupported: true,
      }).independentRecall,
    ).toBe(false);
  });
  it("uses prepared recordings in both voices and gives every discovery a valid destination", () => {
    const content = buildAtlasContent();
    for (const gender of ["female", "male"] as const)
      for (const spec of PICNIC_STEPS) {
        const step = content.thai[gender].find((e) => e.id === spec.scene)!
          .steps[spec.index];
        const location = LOCATIONS.find((l) => l.id === spec.scene)!;
        expect(isKnownLine(step.npc.text, location.gender, "th")).toBe(true);
        for (const c of step.choices)
          expect(isKnownLine(c.line.text, gender, "th")).toBe(true);
      }
    for (const s of SECRETS)
      expect(LOCATIONS.some((l) => l.id === SECRET_LESSONS[s.id]?.scene)).toBe(
        true,
      );
  });
});
