import { chromium } from "@playwright/test";
import { buildAdventureContent } from "../src/lib/adventure/content";
import { strict as assert } from "node:assert";
async function main() {
  const browser = await chromium.connectOverCDP(process.argv[2]);
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().includes("/adventure"))!;
  const content = buildAdventureContent();
  for (const gender of ["male", "female"] as const) {
    for (const mission of content[gender])
      for (const step of mission.steps) {
        const lines = [
          { text: step.npc.text, gender: mission.setup.listenerGender },
          ...step.choices.map((c) => ({ text: c.line.text, gender })),
        ];
        for (const line of lines) {
          const params = new URLSearchParams({
            ...line,
            region: "bangkok",
            pace: "learner",
            v: "2",
          });
          const r = await page.request.get(
            `http://localhost:3000/api/tts?${params}`,
          );
          assert.equal(
            r.status(),
            200,
            `${line.text} must resolve to a prepared clip`,
          );
          assert(r.headers()["content-type"].includes("audio"));
          assert((await r.body()).length > 500);
        }
      }
  }
  console.log(
    "PASS: every adventure NPC and choice resolves to a real MP3 for both speaking styles without synthesis credentials",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as unknown as { __bridgeAudio: HTMLMediaElement }).__bridgeAudio =
        this;
      return original.call(this);
    };
  });
  await page
    .getByRole("button", { name: "A neighbour needs you", exact: false })
    .click();
  await page
    .getByRole("button", {
      name: "Listen to the neighbour’s request",
      exact: false,
    })
    .click();
  await page.waitForFunction(() => {
    const a = (window as unknown as { __bridgeAudio: HTMLMediaElement })
      .__bridgeAudio;
    return a?.readyState >= 2 && a.duration > 0;
  });
  console.log("PASS: browser decodes and plays the prepared listening request");
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
