import { chromium, expect } from "@playwright/test";
import { strict as assert } from "node:assert";
import { buildAtlasContent } from "../src/lib/atlas/content";
import { PICNIC_STEPS } from "../src/lib/atlas/picnic";
const base = process.env.GAME_URL ?? "http://localhost:3000";
async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
    proxy: {
      server: process.env.HTTPS_PROXY ?? "http://proxy:8080",
      bypass: "localhost,127.0.0.1",
    },
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      ignoreHTTPSErrors: true,
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const content = buildAtlasContent();
    await page.goto(base + "/adventure", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page
      .getByRole("button", { name: "Plan a picnic →", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Picnic afternoon",
      exact: true,
    });
    await expect(
      dialog.getByText("An afternoon with Mali", { exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: "/tmp/picnic-start.png", fullPage: true });
    for (let n = 0; n < 6; n++) {
      const spec = PICNIC_STEPS[n];
      const step = content.thai.female.find((e) => e.id === spec.scene)!.steps[
        spec.index
      ];
      if (n % 2 === 0) {
        if (n === 2) await dialog.getByRole("checkbox").check();
        await dialog
          .getByRole("button", { name: `Next: ${spec.goal} →`, exact: true })
          .click();
      }
      if (n === 2) {
        await page.setViewportSize({ width: 320, height: 740 });
        await page.setViewportSize({ width: 390, height: 844 });
      }
      const choices = dialog.locator(".atlas-audio-choice");
      await expect(choices.first()).toBeVisible({ timeout: 15000 });
      if (n === 2) {
        await expect(choices.first().locator("small")).toHaveCount(0);
        const wrong = step.choices.find((c) => !c.correct)!;
        await choices
          .locator("button")
          .filter({ hasText: wrong.line.text })
          .first()
          .click();
        await expect(dialog.getByRole("status")).toContainText(
          "waits while you try again",
        );
        await dialog
          .getByRole("button", {
            name: "Need a clue? Show meanings",
            exact: true,
          })
          .click();
        await expect(choices.first().locator("small").first()).toBeVisible();
      }
      const right = step.choices.find((c) => c.id === "ok")!;
      await choices
        .locator("button")
        .filter({ hasText: right.line.text })
        .first()
        .click();
      await expect(dialog.locator(".picnic-scene")).toContainText(spec.effect);
      if (n === 5)
        await page.screenshot({
          path: "/tmp/picnic-fruit.png",
          fullPage: true,
        });
      await dialog
        .getByRole("button", {
          name: n % 2 === 0 ? "Keep talking →" : "Pack this memory →",
          exact: true,
        })
        .click();
      if (n === 1) {
        await dialog
          .getByRole("button", {
            name: "Save my place & take a break",
            exact: true,
          })
          .click();
        await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
        await page
          .getByRole("button", { name: "Continue picnic →", exact: true })
          .click();
        await expect(
          dialog.getByRole("heading", { name: "Mali kept your place." }),
        ).toBeVisible();
      }
    }
    await dialog
      .getByRole("button", { name: "Meet at the picnic →", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "One memory at the picnic" }),
    ).toBeVisible();
    const memory = content.thai.female
      .find((e) => e.id === "restaurant")!
      .steps[1].choices.find((c) => c.id === "ok")!.line;
    await expect(
      dialog.getByText(
        "Mali brings back a phrase you practised earlier. What does it mean?",
        { exact: true },
      ),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Reveal the phrase", exact: true })
      .click();
    await expect(dialog.locator(".atlas-clue")).toContainText(memory.text);
    await dialog
      .getByRole("button", { name: memory.gloss, exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Enjoy the picnic →", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "A picnic you made happen." }),
    ).toBeVisible();
    await page.screenshot({ path: "/tmp/picnic-finish.png", fullPage: true });
    const save = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("bt_atlas_v1")!),
    );
    assert.equal(save.picnic.finished, true);
    assert.equal(save.picnic.independentRecall, false);
    assert.deepEqual(save.picnic.missed, [2]);
    assert.deepEqual(save.completed, []);
    assert.equal(save.coins, 0);
    await dialog
      .getByRole("button", {
        name: "Another time: try these phrases with less help →",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Mixed memory practice" }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Close Mixed memory practice", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 740 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.goto(base + "/adventure?scene=first-hello", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.getByText(/Mali remembers you/)).toBeVisible();
    assert.deepEqual(errors, []);
    console.log(
      "PASS picnic: six exchanges, three visual items, pause/reload, optional challenge/help, missed-phrase recall, honest saved result, followuppractice, returningfriend and320px layout",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
