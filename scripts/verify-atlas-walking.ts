/** Real canvas taps: arrival survives rotation, and navigation cancels cleanly. */
import { chromium, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { DISTRICTS, LOCATIONS } from "../src/lib/atlas/catalog";

const base = process.env.GAME_URL ?? "http://localhost:3000";
const output = process.env.GAME_SCREENSHOT_DIR;
async function tapCafe(page: Page) {
  await page.getByRole("button", { name: "Centre district", exact: true }).click();
  const box = (await page.locator(".atlas-map").boundingBox())!;
  const town = DISTRICTS.find((d) => d.id === "town")!;
  const cafe = LOCATIONS.find((l) => l.id === "first-hello")!;
  const zoom = Math.max(0.3, Math.min(1.1, box.width / 730, box.height / 600));
  const scrollX = Math.max(0, town.x - box.width / (2 * zoom));
  const scrollY = Math.max(0, town.y + 10 - box.height / (2 * zoom));
  await page.mouse.click(
    box.x + (cafe.x - scrollX) * zoom,
    box.y + (cafe.y + 10 - scrollY) * zoom,
  );
}
async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
    proxy: { server: process.env.HTTPS_PROXY ?? "http://proxy:8080", bypass: "localhost,127.0.0.1" },
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
    await page.route("**/*", (r) => /\/api\/tts|\/audio\//.test(r.request().url()) ? r.abort() : r.continue());
    await page.goto(`${base}/adventure`);
    await page.locator("canvas").waitFor();
    await page.addStyleTag({ content: "nextjs-portal { display:none }" });
    const map = page.locator(".atlas-map");
    const conversation = page.getByRole("dialog", { name: "Conversation with Mali" });
    for (const rotate of [false, true]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await tapCafe(page);
      await expect(map).toHaveAttribute("data-walk", "walking");
      if (rotate) await page.setViewportSize({ width: 844, height: 390 });
      else await page.evaluate(() => {
        for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("resize"));
      });
      await expect(conversation).toBeVisible({ timeout: 6000 });
      await expect(map).toHaveAttribute("data-walk", "idle");
      if (output) {
        fs.mkdirSync(output, { recursive: true });
        await page.screenshot({ path: path.join(output, `canvas-arrival-${rotate ? "landscape" : "portrait"}.png`) });
      }
      await page.keyboard.press("Escape");
      console.log(`PASS canvas arrival after ${rotate ? "rotation" : "same-size resize events"}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await tapCafe(page);
    await expect(map).toHaveAttribute("data-walk", "walking");
    await page.getByRole("button", { name: "Centre district", exact: true }).click();
    await page.setViewportSize({ width: 844, height: 390 });
    // Observe longer than the maximum walk: a cancelled destination must stay cancelled.
    await page.waitForTimeout(2800);
    await expect(map).toHaveAttribute("data-walk", "idle");
    await expect(conversation).toHaveCount(0);
    console.log("PASS explicit navigation cancels the pending canvas visit");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.locator("canvas").waitFor();
    await tapCafe(page);
    await expect(conversation).toBeVisible();
    console.log("PASS reduced-motion canvas arrival");
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
