import { chromium, expect } from "@playwright/test";
import { strict as assert } from "node:assert";
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
    // Observe real media playback without replacing Audio or play().
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      const probe = window as unknown as { clips: string[] };
      probe.clips = [];
      HTMLMediaElement.prototype.play = function () {
        return play.call(this).then(() => {
          probe.clips.push(this.src);
        });
      };
    });
    await page.goto(base + "/adventure", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.getByRole("button", { name: "Let’s go →", exact: true }).click();
    const dialog = page.locator("dialog:modal");
    const choices = dialog.locator(".atlas-audio-choice");
    await expect(choices.first()).toBeVisible();
    const count = await choices.count();
    assert(count >= 2);
    // Every answer has its own preview. Previewing does not choose or score an answer.
    for (let i = 0; i < count; i++) {
      await choices
        .nth(i)
        .getByRole("button", { name: /Preview reply:/ })
        .click();
      await expect
        .poll(() =>
          page.evaluate(
            () => (window as unknown as { clips: string[] }).clips.length,
          ),
        )
        .toBe(i + 1);
      await expect(dialog.locator(".atlas-feedback")).toHaveCount(0);
      await expect(choices.nth(i).locator("button").first()).toBeEnabled();
    }
    // Wait until previews have persistent storage, then reload to discard all memory URLs.
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              new Promise<number>((resolve, reject) => {
                const req = indexedDB.open("bt-audio", 1);
                req.onsuccess = () => {
                  const count = req.result
                    .transaction("clips")
                    .objectStore("clips")
                    .count();
                  count.onsuccess = () => resolve(count.result);
                  count.onerror = () => reject(count.error);
                };
                req.onerror = () => reject(req.error);
              }),
          ),
        { timeout: 30000 },
      )
      .toBeGreaterThan(count);
    await page.screenshot({
      path: "/tmp/atlas-audio-mobile.png",
      fullPage: true,
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    let audioRequests = 0;
    await page.route(/\/(api\/tts|audio\/)/, (route) => {
      audioRequests++;
      return route.abort();
    });
    await page.getByRole("button", { name: "Let’s go →", exact: true }).click();
    await expect(choices.first()).toBeVisible();
    // Give IndexedDB hydration time, then require actual blob audio playback without a network.
    await expect
      .poll(
        async () => {
          const button = choices
            .first()
            .getByRole("button", { name: /Preview reply:/ });
          if (await button.isEnabled()) await button.click();
          return page.evaluate(() =>
            (window as unknown as { clips: string[] }).clips.some((src) =>
              src.startsWith("blob:"),
            ),
          );
        },
        { timeout: 15000 },
      )
      .toBe(true);
    await expect(dialog.locator(".atlas-feedback")).toHaveCount(0);
    // Choosing remains independent of listening and still produces feedback.
    await choices.first().locator("button").first().click();
    await expect(dialog.locator(".atlas-feedback")).toBeVisible();
    await page.setViewportSize({ width: 320, height: 740 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        previews: count,
        persistentOfflinePlayback: true,
        audioRequestsAfterReload: audioRequests,
        errors,
      }),
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
