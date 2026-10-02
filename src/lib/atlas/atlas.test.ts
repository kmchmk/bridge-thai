import { describe, it, expect } from "vitest";
import { SCENES } from "@/lib/content";
import { EN_SCENES } from "@/lib/english";
import { isKnownLine } from "@/lib/tts/allowlist";
import { LOCATIONS, QUESTS, SECRETS } from "./catalog";
import { buildAtlasContent } from "./content";
import {
  completeLocation,
  discoverSecret,
  freshAtlas,
  nextStop,
  parseAtlas,
} from "./progress";
describe("expanded adventure", () => {
  it("covers every existing Thai and English scene with a playable map location", () => {
    expect(LOCATIONS.map((l) => l.id).sort()).toEqual(
      [...SCENES, ...EN_SCENES].map((s) => s.id).sort(),
    );
    expect(new Set(LOCATIONS.map((l) => l.id)).size).toBe(23);
    expect(new Set(QUESTS.flatMap((q) => [...q.stops])).size).toBe(23);
  });
  it("uses prepared language lines with the correct voices for every encounter variant", () => {
    const content = buildAtlasContent();
    for (const gender of ["male", "female"] as const) {
      for (const e of content.thai[gender]) {
        const l = LOCATIONS.find((l) => l.id === e.id)!;
        for (const step of e.steps) {
          expect(isKnownLine(step.npc.text, l.gender, "th"), e.id).toBe(true);
          for (const c of step.choices)
            expect(isKnownLine(c.line.text, gender, "th"), e.id).toBe(true);
        }
      }
    }
    for (const [key, encounters] of Object.entries(content.english)) {
      const gender = key.split(":")[0] as "male" | "female";
      for (const e of encounters) {
        const l = LOCATIONS.find((l) => l.id === e.id)!;
        for (const step of e.steps) {
          expect(isKnownLine(step.npc.text, l.gender, "en"), e.id).toBe(true);
          for (const c of step.choices)
            expect(isKnownLine(c.line.text, gender, "en"), e.id).toBe(true);
        }
      }
    }
  });
  it("rewards each scene and linked story once, and tracks supported learning honestly", () => {
    let save = freshAtlas();
    for (const id of QUESTS[0].stops)
      save = completeLocation(save, id, 0, true);
    expect(save.coins).toBe(45);
    expect(save.independent).toEqual([]);
    save = completeLocation(save, "first-hello", 0, false);
    expect(save.coins).toBe(50);
    expect(save.independent).toEqual(["first-hello"]);
    expect(completeLocation(save, "first-hello", 0, false).coins).toBe(50);
    expect(completeLocation(save, "unknown", 0, false)).toBe(save);
    expect(nextStop(save, "th")).toBe("directions");
    expect(nextStop(save, "en")).toBe("en-first-hello");
  });
  it("keeps surprises spatially distinct and stops repeat reward farming", () => {
    expect(SECRETS.length).toBe(10);
    for (const s of SECRETS) {
      expect(
        LOCATIONS.some(
          (l) => Math.abs(l.x - s.x) < 85 && Math.abs(l.y - s.y) < 95,
        ),
      ).toBe(false);
    }
    const save = discoverSecret(freshAtlas(), SECRETS[0].id);
    expect(save.coins).toBe(3);
    expect(discoverSecret(save, SECRETS[0].id)).toBe(save);
  });
  it("loads old saves without erasing them and rejects unknown or corrupt entries", () => {
    const legacy = {
      ...freshAtlas(),
      completed: ["first-hello", "invented"],
      independent: ["invented"],
      secrets: ["cat-parade", "invented"],
      coins: -200,
    };
    const parsed = parseAtlas(JSON.stringify(legacy));
    expect(parsed.completed).toEqual(["first-hello"]);
    expect(parsed.independent).toEqual([]);
    expect(parsed.secrets).toEqual(["cat-parade"]);
    expect(parsed.coins).toBe(0);
    expect(parseAtlas("broken")).toEqual(freshAtlas());
  });
});
