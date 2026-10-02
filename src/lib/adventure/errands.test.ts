import { describe, expect, it } from "vitest";
import { buildAdventureContent } from "./content";
import { finishErrand, nextErrand } from "./errands";
import { freshSave } from "./model";
import { isKnownLine } from "@/lib/tts/allowlist";
describe("neighbourhood errands", () => {
  it("varies deliveries and uses prepared, allow-listed speech with matching voice", () => {
    const content = buildAdventureContent();
    const requests = new Set();
    for (let i = 0; i < 5; i++) {
      const order = nextErrand(content, { ...freshSave(), errands: i });
      requests.add(order.id);
      expect(order.source).not.toBe(order.receiver);
      expect(isKnownLine(order.request.text, order.voice, "th")).toBe(true);
      expect(
        isKnownLine(order.paymentLine.text, order.paymentVoice, "th"),
      ).toBe(true);
    }
    expect(requests.size).toBe(5);
  });
  it("never farms rewards, reimburses the customer, and recognizes later independence", () => {
    const order = nextErrand(buildAdventureContent(), freshSave());
    const supported = finishErrand(freshSave(), order, false);
    const independent = finishErrand(supported, order, true);
    const replay = finishErrand(independent, order, true);
    expect(supported.coins).toBe(5);
    expect(independent.coins).toBe(10);
    expect(replay.coins).toBe(10);
    expect(replay.wallet).toBe(400);
    expect(replay.postcards).toEqual([order.id]);
    expect(replay.independentErrands).toEqual([order.id]);
  });
  it("keeps a rice order coherent and accepts polite neighbour replies", () => {
    const missions = buildAdventureContent().female;
    expect(
      missions.find((m) => m.id === "noodles")!.riceNpc!.text,
    ).not.toContain("ข้าวซอย");
    expect(
      missions
        .find((m) => m.id === "friend")!
        .steps[0].choices.find((c) => c.id === "too-stiff")!.correct,
    ).toBe(true);
  });
});
