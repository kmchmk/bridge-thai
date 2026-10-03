/** Real browser checks. Start the dev server and pass a local Chromium CDP URL. */
import { chromium } from "@playwright/test";
import { SCENES } from "../src/lib/content";
import { buildSteps } from "../src/lib/game";
import type { Setup } from "../src/lib/register/types";
import { strict as assert } from "node:assert";

async function main() {
  const browser = await chromium.connectOverCDP(process.argv[2]);
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().includes("/adventure"))!;
  console.log("Starting browser journey");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.evaluate(() => localStorage.removeItem("bt_adventure_v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Meet Mali →", exact: true }).click();
  const definitions = [
    {
      scene: "first-hello",
      name: "Mali",
      listenerGender: "female",
      relationship: "friend",
    },
    {
      scene: "noodle-stall",
      name: "Arun",
      listenerGender: "male",
      relationship: "stranger",
    },
    {
      scene: "market-haggling",
      name: "Dao",
      listenerGender: "female",
      relationship: "stranger",
    },
  ] as const;
  for (let i = 0; i < definitions.length; i++) {
    const d = definitions[i];
    console.log(`Playing ${d.name}`);
    const setup: Setup = {
      speakerGender: "female",
      listenerGender: d.listenerGender,
      relationship: d.relationship,
      region: "bangkok",
    };
    const steps = buildSteps(
      SCENES.find((s) => s.id === d.scene)!,
      setup,
    );
    const panel = page.getByRole("region", {
      name: `Conversation with ${d.name}`,
    });
    await panel.waitFor();
    for (let j = 0; j < steps.length; j++) {
      const correct = steps[j].choices.find((c) => c.correct)!;
      if (i === 0 && j === 0) {
        await panel
          .locator(".dialogue-choices button")
          .filter({ hasText: "Nice to meet you." })
          .click();
        assert(
          await panel.locator(".response-feedback").count(),
          "Incorrect answers must explain and permit retry",
        );
      }
      await panel
        .locator(".dialogue-choices button")
        .filter({ has: page.locator("span", { hasText: correct.line.text }) })
        .first()
        .click();
      await panel
        .getByRole("button", {
          name:
            j + 1 === steps.length ? "Collect your keepsake" : "Keep talking",
        })
        .click();
    }
    if (i === 1) {
      const activity = page.getByRole("region", {
        name: "Prepare your breakfast",
      });
      await activity
        .getByRole("button", { name: "🌶 ไม่เผ็ดมาก", exact: true })
        .click();
      await activity
        .getByRole("button", { name: "Ready! Let’s pay →" })
        .click();
      await activity
        .getByRole("button", { name: "฿50 ห้าสิบ", exact: true })
        .click();
      await activity.getByRole("button", { name: "Pay & collect →" }).click();
    } else if (i === 2) {
      const activity = page.getByRole("region", { name: "Pay at the market" });
      await activity
        .getByRole("button", { name: "฿100 หนึ่งร้อย", exact: true })
        .click();
      await activity
        .getByRole("button", { name: "฿50 ห้าสิบ", exact: true })
        .click();
      await activity.getByRole("button", { name: "Pay & collect →" }).click();
    }
    await page.getByRole("region", { name: "Mission complete" }).waitFor();
    await page.screenshot({
      path: `/tmp/bridge-reward-${i}.png`,
      fullPage: true,
    });
    if (i < definitions.length - 1)
      await page
        .getByRole("button", { name: `Next: meet ${definitions[i + 1].name}` })
        .click();
  }
  const raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("bt_adventure_v1")!),
  );
  assert.equal(raw.completed.length, 3);
  assert.equal(raw.coins, 90);
  assert.equal(raw.wallet, 200);
  await page
    .getByRole("button", { name: "You’re invited. Let’s picnic!" })
    .click();
  for (let i = 0; i < 6; i++) {
    await page
      .locator(".challenge-panel .dialogue-choices button")
      .first()
      .click();
    await page
      .getByRole("button", {
        name: i === 5 ? "Watch the sun go down" : "Next memory",
      })
      .click();
  }
  await page
    .getByRole("heading", { name: "You’ve found your people." })
    .waitFor();
  await page.screenshot({ path: "/tmp/bridge-picnic-v1.png", fullPage: true });
  await page.getByRole("button", { name: "Take another walk" }).click();
  await page
    .getByRole("button", { name: "Make this place yours", exact: false })
    .click();
  await page.getByRole("button", { name: "Add for 25 ✦" }).click();
  await page.getByRole("button", { name: "Add for 20 ✦" }).click();
  await page.getByRole("button", { name: "Add for 15 ✦" }).click();
  await page.getByRole("button", { name: "Close keepsake shop" }).click();
  await page.screenshot({ path: "/tmp/bridge-world-v2.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.screenshot({ path: "/tmp/bridge-mobile-v2.png", fullPage: true });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile must not scroll horizontally",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: three missions, incorrect-answer recovery, breakfast spice, baht payment, wallet, decorations, sunset, six-round recall, mobile zoom, no page errors",
  );
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
