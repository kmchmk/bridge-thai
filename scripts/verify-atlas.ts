import { chromium, type Page } from "@playwright/test";
import { strict as assert } from "node:assert";
import { buildAtlasContent } from "../src/lib/atlas/content";
import { DISTRICTS, LOCATIONS, SECRETS } from "../src/lib/atlas/catalog";
import { ATLAS_KEY, freshAtlas, parseAtlas } from "../src/lib/atlas/progress";
import { matchesPhrase } from "../src/lib/adventure/practice";
const base = process.env.GAME_URL ?? "http://localhost:3000";
async function baht(page: Page, total: number) {
  for (const value of [100, 50, 20, 10])
    while (total >= value) {
      await page
        .locator("dialog:modal .baht-buttons button")
        .filter({ hasText: `฿${value}` })
        .click();
      total -= value;
    }
  assert.equal(total, 0);
}
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
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert(page.url().includes("/adventure"));
    await page.locator("canvas").waitFor();
    await page
      .getByRole("button", { name: "Plan a picnic →", exact: true })
      .waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "No mobile overflow",
    );
    await page.screenshot({
      path: "/tmp/atlas-mobile-first.png",
      fullPage: true,
    });
    const content = buildAtlasContent();
    const all = [
      ...content.thai.female,
      ...content.english["female:us:neutral"],
    ];
    const extrasOnly = process.env.VERIFY_ATLAS_EXTRAS === "1";
    if (extrasOnly) {
      const fixture = freshAtlas();
      fixture.completed = all.map((e) => e.id);
      fixture.independent = fixture.completed.slice(1);
      fixture.stars = Object.fromEntries(
        fixture.completed.map((id) => [id, 3]),
      );
      fixture.coins = 500;
      fixture.chapter.wallet = 200;
      fixture.welcomeSeen = true;
      await page.evaluate(
        ({ key, save }) => localStorage.setItem(key, JSON.stringify(save)),
        { key: ATLAS_KEY, save: fixture },
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("canvas").waitFor();
    }
    for (const [index, e] of (extrasOnly ? [] : all).entries()) {
      const l = LOCATIONS.find((l) => l.id === e.id)!;
      {
        await page
          .getByRole("navigation", { name: "World districts" })
          .getByRole("button", {
            name: DISTRICTS.find((d) => d.id === l.district)!.name,
            exact: false,
          })
          .click();
        await page
          .getByRole("navigation", { name: "Game menu" })
          .locator("button")
          .first()
          .click();
        await page
          .locator("dialog:modal .atlas-place-list button")
          .filter({ hasText: l.name })
          .click();
      }
      const dialog = page.locator("dialog:modal");
      await page
        .getByRole("dialog", { name: `Conversation with ${l.person}` })
        .waitFor();
      // Verify the spoken source resolves to committed audio with its regional/accent identity.
      const query = new URLSearchParams({
        text: e.steps[0].npc.text,
        gender: l.gender,
        pace: "learner",
        ...(l.course === "th" ? { region: l.region } : { accent: "us" }),
        v: "2",
      });
      const audio = await page.request.get(`${base}/api/tts?${query}`);
      assert.equal(audio.status(), 200, `${e.id} prepared audio`);
      assert(audio.headers()["content-type"].includes("audio"));
      for (const [stepIndex, step] of e.steps.entries()) {
        const answer = step.choices.find((c) => c.id === "ok")!;
        if (index === 0 && stepIndex === 0) {
          await dialog
            .locator(".atlas-options button")
            .filter({
              hasText: step.choices.find((c) => !c.correct)!.line.text,
            })
            .first()
            .click();
          await dialog.getByRole("status").waitFor();
        }
        try {
          await dialog
            .locator(".atlas-options button")
            .filter({ hasText: answer.line.text })
            .first()
            .click({ timeout: 6000 });
        } catch (error) {
          console.log(e.id, stepIndex, await dialog.innerText());
          await page.screenshot({
            path: "/tmp/atlas-failure.png",
            fullPage: true,
          });
          throw error;
        }
        try {
          await dialog.locator(".atlas-primary").click({ timeout: 6000 });
        } catch (error) {
          console.log(
            "BUTTON FAIL",
            e.id,
            stepIndex,
            await dialog.innerText(),
            await dialog.boundingBox(),
            await dialog.locator(".atlas-primary").boundingBox(),
          );
          await page.screenshot({
            path: "/tmp/atlas-failure.png",
            fullPage: true,
          });
          throw error;
        }
      }
      if (e.id === "noodle-stall") {
        await dialog
          .getByRole("button", { name: "ไม่เผ็ดมาก 🌶", exact: true })
          .click();
        await dialog
          .getByRole("button", { name: "Cook & pay →", exact: true })
          .click();
      }
      if (e.id === "noodle-stall" || e.id === "market-haggling") {
        const price = e.id === "noodle-stall" ? 50 : 150;
        await baht(page, price);
        await dialog
          .getByRole("button", { name: "Pay & collect →", exact: true })
          .click();
        await baht(page, 200 - price);
        await dialog
          .getByRole("button", {
            name: "Return change & collect →",
            exact: true,
          })
          .click();
      }
      await dialog
        .getByRole("heading", { name: "What did you hear?", exact: false })
        .waitFor();
      await dialog
        .locator(".atlas-options button")
        .filter({
          hasText: e.steps[0].choices.find((c) => c.id === "ok")!.line.gloss,
        })
        .click();
      await dialog.locator(".atlas-primary").click();
      await page.getByRole("dialog", { name: "A moment to keep" }).waitFor();
      if ([0, 17, 24].includes(index))
        await page.screenshot({
          path: `/tmp/atlas-stamp-${index}.png`,
          fullPage: true,
        });
      await dialog
        .getByRole("button", { name: "Close A moment to keep", exact: true })
        .click();
      console.log(`PASS ${index + 1}/25 ${e.id}`);
    }
    const save = parseAtlas(
      await page.evaluate((key) => localStorage.getItem(key), ATLAS_KEY),
    );
    assert.equal(save.completed.length, 25);
    assert.equal(save.independent.length, 24);
    assert.equal(save.chapter.wallet, 200);
    // Native dialog focus stays inside; its close button and escape restore the underlying game.
    await page
      .getByRole("navigation", { name: "Game menu" })
      .locator("button")
      .last()
      .click();
    assert(
      await page.evaluate(
        () => document.activeElement?.closest("dialog") !== null,
      ),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog:modal").count(), 0);
    // Surprises are found on the real canvas, not through a collection button.
    for (const secret of SECRETS) {
      const d = DISTRICTS.find((d) => d.id === secret.district)!;
      await page
        .getByRole("navigation", { name: "World districts" })
        .getByRole("button", { name: d.name, exact: false })
        .click();
      await page
        .getByRole("button", { name: "Centre district", exact: true })
        .click();
      const box = (await page.locator(".atlas-map").boundingBox())!;
      const zoom = Math.max(
        0.5,
        Math.min(1.1, Math.min(box.width / 730, box.height / 600)),
      );
      const scrollX = Math.max(
        0,
        Math.min(2660 - box.width / zoom, d.x - box.width / (2 * zoom)),
      );
      const scrollY = Math.max(
        0,
        Math.min(1600 - box.height / zoom, d.y + 10 - box.height / (2 * zoom)),
      );
      const x = box.x + (secret.x - scrollX) * zoom,
        y = box.y + (secret.y - scrollY) * zoom;
      console.log(`Finding ${secret.id}`);
      await page.mouse.click(x, y);
      await page.getByRole("dialog", { name: "A hidden surprise" }).waitFor();
      await page
        .getByRole("heading", { name: secret.name, exact: true })
        .waitFor();
      if (secret.id === "cat-parade") {
        await page
          .getByRole("button", {
            name: "Try the discovery’s conversation →",
            exact: true,
          })
          .click();
        await page
          .getByRole("dialog", { name: "Conversation with Mali", exact: true })
          .waitFor();
        await page
          .getByRole("button", {
            name: "Close Conversation with Mali",
            exact: true,
          })
          .click();
      } else
        await page
          .getByRole("button", { name: "Keep exploring →", exact: true })
          .click();
    }
    const discovered = parseAtlas(
      await page.evaluate((key) => localStorage.getItem(key), ATLAS_KEY),
    );
    assert.equal(discovered.secrets.length, 10);
    assert.equal(discovered.coins - save.coins, 30);
    await page
      .getByRole("navigation", { name: "Game menu" })
      .locator("button")
      .nth(2)
      .click();
    await page.getByRole("button", { name: "Make your world yours →" }).click();
    const shop = page.locator("dialog:modal");
    for (const cost of [25, 20, 15, 30])
      await shop
        .getByRole("button", { name: `Add for ${cost} coins →`, exact: true })
        .click();
    await shop.getByRole("button", { name: /Close / }).click();
    // Restore Thai for mixed-mode recall, and deliberately use clues to test fair scoring.
    await page
      .getByRole("navigation", { name: "World districts" })
      .getByRole("button", { name: "Old town", exact: false })
      .click();
    await page
      .getByRole("button", { name: "A little less help", exact: false })
      .click();
    for (let round = 0; round < 6; round++) {
      const panel = page.locator("dialog:modal");
      await panel
        .getByRole("button", {
          name: "Need a clue? Reveal the phrase",
          exact: true,
        })
        .click();
      const expected = await panel.locator(".atlas-clue p").first().innerText();
      const meaning = await panel.locator(".atlas-clue p").last().innerText();
      if (round % 3 === 0)
        await panel
          .locator(".atlas-options button")
          .filter({ hasText: meaning })
          .click();
      else if (round % 3 === 1)
        await panel
          .locator(".atlas-options button")
          .filter({ hasText: expected })
          .first()
          .click();
      else {
        let remaining = expected.replace(/\s/g, "");
        let assembled = "";
        while (remaining) {
          const tokens = await panel
            .locator(".atlas-tokens button:enabled")
            .all();
          let selected = false;
          for (const token of tokens) {
            const value = await token.innerText(),
              normalized = value.replace(/\s/g, "");
            if (normalized && remaining.startsWith(normalized)) {
              await token.click();
              assembled += value;
              remaining = remaining.slice(normalized.length);
              selected = true;
              break;
            }
          }
          assert(selected, `Could not assemble ${expected}`);
        }
        assert(matchesPhrase(assembled, expected));
        await panel
          .getByRole("button", { name: "Check phrase", exact: true })
          .click();
      }
      await panel.locator(".atlas-primary").last().click();
    }
    await page
      .getByRole("heading", {
        name: "0/6 recalled independently.",
        exact: true,
      })
      .waitFor();
    await page.locator("dialog:modal .atlas-primary").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("canvas").waitFor();
    assert.equal(
      parseAtlas(
        await page.evaluate((key) => localStorage.getItem(key), ATLAS_KEY),
      ).completed.length,
      25,
    );
    await page.screenshot({
      path: "/tmp/atlas-mobile-complete.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: "Centre district", exact: true })
      .click();
    await page.screenshot({ path: "/tmp/atlas-desktop.png", fullPage: true });
    for (const path of [
      "/scenes",
      "/play/pharmacy",
      "/play/en-hotel",
      "/adventure/neighbourhood",
    ]) {
      await page.goto(base + path, { waitUntil: "domcontentloaded" });
      assert(
        page.url().includes("/adventure"),
        `Legacy path ${path} must open game`,
      );
      if (path.startsWith("/play/"))
        await page.locator("dialog:modal").waitFor();
    }
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      extrasOnly
        ? "PASS seeded completed-world regression: hidden surprises, discovery conversation, mixed practice, cosmetics, mobile layout, save persistence and legacy redirects"
        : "PASS all25encounters, hidden surprises, mixed practice, cosmetics, mobile layout, save persistence and legacy redirects",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
