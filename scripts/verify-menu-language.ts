/** Verify migration from conflicting preferences and consistent language across routes. */
import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const base = process.env.GAME_URL ?? "http://localhost:3000";
const output = process.env.GAME_SCREENSHOT_DIR;
async function main() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium", args: ["--no-sandbox"],
    proxy: { server: process.env.HTTPS_PROXY ?? "http://proxy:8080", bypass: "localhost,127.0.0.1" },
  });
  try {
    for (const language of ["en", "th"] as const) {
      const context = await browser.newContext({ viewport: { width: Number(process.env.GAME_WIDTH ?? 390), height: Number(process.env.GAME_HEIGHT ?? 844) }, ignoreHTTPSErrors: true });
      // Reproduce the report: old cookie and saved menu preference disagree.
      await context.addCookies([{ name: "bt_native", value: language === "en" ? "th" : "en", url: base }]);
      const page = await context.newPage();
      await page.route("**/*", (r) => /\/api\/tts|\/audio\//.test(r.request().url()) ? r.abort() : r.continue());
      await page.goto(`${base}/adventure`);
      await page.evaluate((value) => localStorage.setItem("bt_atlas_preferences", JSON.stringify({ interfaceLanguage: value, course: "th", gender: "male" })), language);
      await page.reload();
      await page.locator("canvas").waitFor();
      await page.addStyleTag({ content: "nextjs-portal{display:none}" });
      const signin = page.locator(".site-sign-in");
      await expect(signin).toHaveText(language === "en" ? "Sign in" : "เข้าสู่ระบบ");
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await page.locator(".atlas-bottom button").last().click();
      const menu = page.getByRole("combobox", { name: "Menu language / ภาษาเมนู" });
      await expect(menu).toHaveValue(language);
      const course = page.locator("dialog select").first();
      await expect(course).toHaveValue("th");
      const next = language === "en" ? "th" : "en";
      await menu.selectOption(next);
      await expect(signin).toHaveText(next === "en" ? "Sign in" : "เข้าสู่ระบบ");
      await expect(course).toHaveValue("th");
      await expect(page.locator("html")).toHaveAttribute("lang", next);
      await page.getByText(next === "en" ? "How to play" : "วิธีเล่น", { exact: true }).click();
      if (output) {
        fs.mkdirSync(output, { recursive: true });
        await page.screenshot({ path: path.join(output, `settings-${next}.png`) });
      }
      await page.keyboard.press("Escape");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const start = page.locator(".picnic-task .atlas-primary");
      expect(await start.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.bottom - 2));
      }), "Translated start action is clear of bottom navigation").toBe(true);
      if (output) await page.screenshot({ path: path.join(output, `home-${next}.png`) });
      await page.reload();
      await expect(signin).toHaveText(next === "en" ? "Sign in" : "เข้าสู่ระบบ");
      await page.goto(`${base}/sign-in`);
      await expect(page.locator(".cl-headerTitle")).toContainText(next === "en" ? "Sign in" : "เข้าสู่ระบบ");
      await expect(signin).toHaveText(next === "en" ? "Sign in" : "เข้าสู่ระบบ");
      if (output) await page.screenshot({ path: path.join(output, `sign-in-${next}.png`) });
      await page.goto(`${base}/adventure`);
      await expect(signin).toHaveText(next === "en" ? "Sign in" : "เข้าสู่ระบบ");
      await page.locator(".atlas-bottom button").last().click();
      await expect(page.locator("dialog select").first()).toHaveValue("th");
      await expect(page.locator("dialog select").nth(2)).toHaveValue("male");
      console.log(`PASS ${language} → ${next}: old-cookie conflict, header, settings, HTML language, reload, Clerk sign-in and retained course/voice`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
