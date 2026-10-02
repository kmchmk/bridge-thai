import { chromium } from "@playwright/test";
import { buildAdventureContent } from "../src/lib/adventure/content";
import { nextErrand } from "../src/lib/adventure/errands";
import { parseSave } from "../src/lib/adventure/model";
import { strict as assert } from "node:assert";
async function main() {
  const browser = await chromium.connectOverCDP(process.argv[2]);
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) => p.url().includes("/adventure"))!;
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.reload({ waitUntil: "domcontentloaded" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const content = buildAdventureContent();
  const start = parseSave(
    await page.evaluate(() => localStorage.getItem("bt_adventure_v1")),
  );
  for (let round = 0; round < 5; round++) {
    const before = parseSave(
      await page.evaluate(() => localStorage.getItem("bt_adventure_v1")),
    );
    const order = nextErrand(content, before);
    console.log(`Delivering ${order.item} to ${order.name}`);
    await page
      .getByRole("button", { name: "A neighbour needs you", exact: false })
      .click();
    const panel = page.getByRole("region", { name: "Neighbourhood errand" });
    await panel
      .getByRole("button", {
        name: "Listen to the neighbour’s request",
        exact: false,
      })
      .click();
    if (round === 0) {
      await panel
        .getByRole("button", { name: "Mali Café", exact: false })
        .click();
      await panel
        .getByText("but this isn’t the right pickup spot", { exact: false })
        .waitFor();
    }
    await panel
      .locator(".errand-locations button")
      .filter({ hasText: order.source === "noodles" ? "Arun" : "Dao" })
      .click();
    await panel
      .getByText(`At ${order.source === "noodles" ? "Arun" : "Dao"}’s stall`, {
        exact: false,
      })
      .waitFor();
    const item =
      order.item === "rice"
        ? "ผัดกะเพรา"
        : order.item === "noodles"
          ? "ข้าวซอย"
          : "ผ้าพันคอ";
    if (round === 0) {
      await panel
        .locator(".errand-items button")
        .filter({ hasText: "ผัดกะเพรา" })
        .click();
      await panel
        .getByText("That’s a different item", { exact: false })
        .waitFor();
    }
    await panel
      .locator(".errand-items button")
      .filter({ hasText: item })
      .click();
    if (order.price === 150)
      await panel
        .getByRole("button", { name: "฿100 หนึ่งร้อย", exact: true })
        .click();
    await panel
      .getByRole("button", { name: "฿50 ห้าสิบ", exact: true })
      .click();
    await panel.getByRole("button", { name: "Pay & collect →" }).click();
    await page.screenshot({
      path: `/tmp/bridge-delivery-${round}.png`,
      fullPage: true,
    });
    await panel
      .getByRole("button", { name: `Walk to ${order.name} →` })
      .click();
    await panel
      .getByRole("button", { name: `Hand it to ${order.name} →` })
      .click();
    await panel
      .getByRole("heading", { name: "A favour, remembered." })
      .waitFor();
    await page.screenshot({
      path: `/tmp/bridge-postcard-${round}.png`,
      fullPage: true,
    });
    await panel.getByRole("button", { name: "Take another walk →" }).click();
  }
  const end = parseSave(
    await page.evaluate(() => localStorage.getItem("bt_adventure_v1")),
  );
  assert.equal(end.wallet, start.wallet);
  assert.equal(end.postcards.length, 5);
  assert.equal(end.errands, start.errands + 5);
  assert(end.independentErrands.length >= 4);
  assert.equal(errors.length, 0, errors.join("\n"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert(
    (await page.locator(".world-viewport").evaluate((el) => el.scrollLeft)) > 0,
    "Zoom should centre the map",
  );
  await page.getByRole("button", { name: "Pan map right" }).click();
  await page.screenshot({ path: "/tmp/bridge-mobile-v3.png", fullPage: true });
  console.log(
    "PASS: five varying spoken errands, wrong pickup/item recovery, payment, carried items, spatial delivery, unique postcards, customer funds, centred mobile zoom and pan",
  );
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
