import { chromium } from "@playwright/test";
import { SCENES } from "../src/lib/content";
import { buildSteps } from "../src/lib/game";
import { phraseChunks } from "../src/lib/adventure/practice";
import type { Setup } from "../src/lib/register/types";
import { strict as assert } from "node:assert";
async function main() {
  const browser = await chromium.connectOverCDP(process.argv[2]);
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().includes("/adventure"))!;
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Neighbourhood requests", exact: false })
    .first()
    .click();
  const definitions = [
    { scene: "first-hello", listenerGender: "female", relationship: "friend" },
    { scene: "noodle-stall", listenerGender: "male", relationship: "stranger" },
    {
      scene: "market-haggling",
      listenerGender: "female",
      relationship: "stranger",
    },
  ] as const;
  const steps = definitions.flatMap((d) =>
    buildSteps(
      SCENES.find((s) => s.id === d.scene)!,
      {
        speakerGender: "female",
        listenerGender: d.listenerGender,
        relationship: d.relationship,
        region: "bangkok",
      } as Setup,
    ),
  );
  let audioResponses = 0;
  page.on("response", (r) => {
    if (r.url().includes("/audio/tts/") && [200, 206].includes(r.status()))
      audioResponses++;
  });
  for (let i = 0; i < 6; i++) {
    const panel = page.getByRole("region", { name: "Neighbourhood practice" });
    await panel
      .getByRole("button", { name: "Need a clue? Show the words" })
      .click();
    const text = await panel.locator(".practice-clue p").innerText();
    if (i % 3 === 0) {
      await panel
        .getByRole("button", { name: "Listen to the request", exact: false })
        .click();
      const step = steps.find(
        (s) => s.choices.find((c) => c.id === "ok")!.line.text === text,
      )!;
      assert(step, "Listening phrase must match an authored line");
      const meaning = step.choices.find((c) => c.id === "ok")!.line.gloss;
      await panel
        .locator(".dialogue-choices button")
        .filter({ hasText: meaning })
        .click();
    } else if (i % 3 === 1) {
      const step = steps.find((s) => s.npc.text === text)!;
      assert(step, "Responding must use an authored NPC line");
      const correct = step.choices.find((c) => c.id === "ok")!.line.text;
      await panel
        .locator(".dialogue-choices button")
        .filter({ has: page.locator("span", { hasText: correct }) })
        .first()
        .click();
    } else {
      for (const chunk of phraseChunks(text)) {
        const buttons = panel.locator(".phrase-tokens button:not(:disabled)");
        let found = false;
        for (let b = 0; b < (await buttons.count()); b++)
          if ((await buttons.nth(b).innerText()).trim() === chunk.trim()) {
            await buttons.nth(b).click();
            found = true;
            break;
          }
        assert(found, `Missing phrase piece: ${chunk}`);
      }
      await panel.getByRole("button", { name: "Say it →" }).click();
      assert(
        (await panel.locator(".response-feedback").innerText()).includes(
          "You found it",
        ),
        "Exact assembly must be accepted",
      );
      await page.screenshot({
        path: `/tmp/bridge-phrase-build-${i}.png`,
        fullPage: true,
      });
    }
    await panel
      .getByRole("button", {
        name: i === 5 ? "Finish your neighbourhood round" : "Next request",
      })
      .click();
  }
  await page
    .getByRole("heading", { name: "A little more independent." })
    .waitFor();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("bt_adventure_v1")!),
  );
  assert(
    Object.values(data.practice).every(
      (p: unknown) => (p as { attempts: number }).attempts >= 1,
    ),
  );
  assert.equal(
    data.coins,
    30,
    "Clue-assisted practice should not award independent recall coins",
  );
  console.log(
    `PASS: six mixed requests, exact phrase assembly, support-aware mastery, persisted attempts; ${audioResponses} prepared audio responses`,
  );
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
