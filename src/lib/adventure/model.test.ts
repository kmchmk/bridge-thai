import { describe, expect, it } from "vitest";
import { finishMission, freshSave, parseSave, type Mission } from "./model";
const mission = { id: "friend", steps: [{ choices: [{ correct: true, line: { text: "สวัสดี" } }] }] } as Mission;
describe("adventure progress", () => {
  it("recovers corrupt and incompatible device saves", () => {
    expect(parseSave("bad JSON")).toEqual(freshSave());
    expect(parseSave(JSON.stringify({ version: 2 }))).toEqual(freshSave());
  });
  it("rejects unknown places and impossible scores", () => {
    const save = parseSave(JSON.stringify({ ...freshSave(), completed: ["friend", "other", "friend"], best: { friend: 9, noodles: 2 }, coins: -5 }));
    expect(save.completed).toEqual(["friend"]); expect(save.best).toEqual({ noodles: 2 }); expect(save.coins).toBe(0);
  });
  it("rewards a first visit once, while allowing improved mastery on replay", () => {
    const first = finishMission(freshSave(), mission, 2);
    const replay = finishMission(first, mission, 0);
    expect(first.coins).toBe(30); expect(replay.coins).toBe(30);
    expect(replay.completed).toEqual(["friend"]); expect(replay.best.friend).toBe(3);
    expect(replay.journal).toEqual(["สวัสดี"]);
  });
});
