import { chromium } from "@playwright/test";
import { strict as assert } from "node:assert";
import { buildAtlasContent } from "../src/lib/atlas/content";
import { freshAtlas, parseAtlas, ATLAS_KEY } from "../src/lib/atlas/progress";
import { nextErrand } from "../src/lib/adventure/errands";
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
    await page.goto(base + "/adventure", { waitUntil: "domcontentloaded" });
    const seeded = freshAtlas();
    seeded.completed = ["first-hello", "noodle-stall", "market-haggling"];
    seeded.chapter.completed = ["friend", "noodles", "market"];
    seeded.chapter.wallet = 200;
    seeded.welcomeSeen = true;
    await page.evaluate(
      ({ key, save }) => localStorage.setItem(key, JSON.stringify(save)),
      { key: ATLAS_KEY, save: seeded },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("canvas").waitFor();
    const content = buildAtlasContent();
    for (let round = 0; round < 5; round++) {
      const before = parseAtlas(
          await page.evaluate((key) => localStorage.getItem(key), ATLAS_KEY),
        ),
        order = nextErrand(content.picnic, before.chapter);
      await page
        .getByRole("button", { name: "A neighbour needs you", exact: false })
        .click();
      const panel = page.locator("dialog:modal");
      await panel
        .locator(".errand-locations button")
        .filter({ hasText: order.source === "noodles" ? "Arun" : "Dao" })
        .click();
      await panel
        .getByText("At ", { exact: false })
        .filter({ hasText: "stall" })
        .waitFor();
      await panel
        .locator(".errand-items button")
        .filter({
          hasText:
            order.item === "rice"
              ? "ผัดกะเพรา"
              : order.item === "noodles"
                ? "ข้าวซอย"
                : "ผ้าพันคอ",
        })
        .click();
      const funds = await panel.locator(".payment-total").innerText();
      assert(funds.includes("฿200"));
      assert(!funds.includes(`฿${order.price}`));
      if (round === 0) {
        await panel
          .getByRole("button", { name: "฿10 สิบ", exact: true })
          .click();
        await panel.getByRole("button", { name: "Pay & collect →" }).click();
        await panel.getByText("A little short", { exact: false }).waitFor();
        await panel
          .getByRole("button", { name: "Take money back", exact: true })
          .click();
      }
      if (order.price === 150)
        await panel
          .getByRole("button", { name: "฿100 หนึ่งร้อย", exact: true })
          .click();
      await panel
        .getByRole("button", { name: "฿50 ห้าสิบ", exact: true })
        .click();
      await panel.getByRole("button", { name: "Pay & collect →" }).click();
      if (order.price === 50)
        await panel
          .getByRole("button", { name: "฿100 หนึ่งร้อย", exact: true })
          .click();
      await panel
        .getByRole("button", { name: "฿50 ห้าสิบ", exact: true })
        .click();
      await panel
        .getByRole("button", { name: "Return change & collect →" })
        .click();
      await panel
        .getByRole("button", { name: `Walk to ${order.name} →` })
        .click();
      await panel
        .getByRole("button", { name: `Hand it to ${order.name} →` })
        .click();
      await panel
        .getByRole("heading", { name: "A favour, remembered.", exact: true })
        .waitFor();
      if (round === 0)
        await panel
          .getByText("A little support, a real achievement.", { exact: true })
          .waitFor();
      await page.screenshot({
        path: `/tmp/atlas-delivery-${round}.png`,
        fullPage: true,
      });
      await panel.getByRole("button", { name: "Take another walk →" }).click();
      console.log(`PASS delivery ${round + 1}: ${order.id}`);
    }
    const result = parseAtlas(
      await page.evaluate((key) => localStorage.getItem(key), ATLAS_KEY),
    );
    assert.equal(result.chapter.wallet, 200);
    assert.equal(result.chapter.postcards.length, 5);
    assert.equal(result.chapter.independentErrands.length, 4);
    assert(!result.chapter.independentErrands.includes("friend:noodles"));
    assert.equal(result.coins, 45);
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "PASS compact-sheet spatial deliveries, wrong-payment independence, change and bounded rewards",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
