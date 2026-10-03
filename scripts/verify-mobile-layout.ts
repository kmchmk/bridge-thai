/** Layout-only verification. Audio requests are blocked; no clips are generated. */
import { chromium, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const base = process.env.GAME_URL ?? "http://localhost:3000";
const output = process.env.GAME_SCREENSHOT_DIR ?? "/tmp/mobile-layout";
async function checkWidth(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const body = page.locator("dialog:modal .atlas-sheet-body");
  if (await body.count())
    expect(
      await body.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
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
    await page.route("**/*", (route) =>
      /\/api\/tts|\/audio\//.test(route.request().url())
        ? route.abort()
        : route.continue(),
    );
    await page.goto(base + "/adventure", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.locator("canvas").waitFor();
    // Suppress the framework's dev-only overlay, not any app content.
    await page.addStyleTag({ content: "nextjs-portal { display:none; }" });
    for (const [width, height] of [
      [320, 568],
      [360, 640],
      [390, 844],
      [430, 932],
      [844, 390],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      await checkWidth(page);
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      const nav = page.getByRole("navigation", { name: "Game menu" });
      if (width <= 1000) await expect(nav).toBeInViewport({ ratio: 1 });
      await expect(
        page.getByRole("button", { name: "Plan a picnic →", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      if (width <= 1000) {
        const start = page.getByRole("button", {
          name: "Plan a picnic →",
          exact: true,
        });
        expect(
          await start.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return [r.top + 4, r.bottom - 4].every((y) =>
              el.contains(document.elementFromPoint(r.x + r.width / 2, y)),
            );
          }),
          "Start action is not covered by fixed navigation",
        ).toBe(true);
      }
      await page.screenshot({
        path: path.join(output, `${width}-home.png`),
        fullPage: width > 1000,
      });
      for (const [i, name] of [
        "places",
        "stories",
        "passport",
        "settings",
      ].entries()) {
        await nav.locator("button").nth(i).click();
        const sheet = page.locator("dialog:modal"),
          body = sheet.locator(".atlas-sheet-body"),
          close = sheet.getByRole("button", { name: /Close / });
        await checkWidth(page);
        await expect(close).toBeInViewport({ ratio: 1 });
        await page.screenshot({
          path: path.join(output, `${width}-${name}.png`),
        });
        await body.evaluate((el) => el.scrollTo(0, el.scrollHeight));
        await expect(close).toBeInViewport({ ratio: 1 });
        await close.click();
      }
      await page
        .getByRole("button", { name: "Plan a picnic →", exact: true })
        .click();
      await checkWidth(page);
      await page.screenshot({ path: path.join(output, `${width}-picnic.png`) });
      await page
        .getByRole("button", { name: "Close Picnic afternoon", exact: true })
        .click();
      console.log(
        `PASS ${width}x${height}: sign-in, navigation, start action, all menus, picnic intro and scrollable sheets`,
      );
    }
    // Larger text reflows without suppressing browser zoom.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({
      content:
        ".atlas-sheet p, .atlas-sheet label, .atlas-sheet select, .atlas-sheet summary { font-size: 24px !important; }",
    });
    await page
      .getByRole("navigation", { name: "Game menu" })
      .locator("button")
      .last()
      .click();
    await checkWidth(page);
    await page.screenshot({ path: path.join(output, "390-larger-text.png") });
    expect(errors).toEqual([]);
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
