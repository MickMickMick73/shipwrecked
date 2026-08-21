import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("ERR", msg.text());
});

await page.goto("http://127.0.0.1:8080/kit-preview.html", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/workspace/screenshots/kit-parts.png" });

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/workspace/screenshots/game-title.png" });

await page.locator("button", { hasText: "Survive" }).click({ force: true });
await page.waitForTimeout(7000);
await page.screenshot({ path: "/workspace/screenshots/game-idle.png" });

await page.keyboard.down("KeyW");
await page.waitForTimeout(2000);
await page.screenshot({ path: "/workspace/screenshots/game-walk.png" });
const walkInfo = await page.evaluate(() => {
  const u = window.__meshyChar;
  return u
    ? {
        currentClip: u.currentClip,
        weights: Object.fromEntries(
          Object.entries(u.actions || {}).map(([k, a]) => [k, Number(a.getEffectiveWeight?.().toFixed?.(2) ?? a.getEffectiveWeight?.())]),
        ),
      }
    : null;
});
console.log("walk", JSON.stringify(walkInfo));
await page.keyboard.up("KeyW");

await page.keyboard.down("ShiftLeft");
await page.keyboard.down("KeyW");
await page.waitForTimeout(1600);
await page.screenshot({ path: "/workspace/screenshots/game-run.png" });
const runInfo = await page.evaluate(() => window.__meshyChar?.currentClip);
console.log("run clip", runInfo);
await page.keyboard.up("KeyW");
await page.keyboard.up("ShiftLeft");

await page.keyboard.down("Space");
await page.waitForTimeout(200);
await page.keyboard.up("Space");
await page.waitForTimeout(350);
await page.screenshot({ path: "/workspace/screenshots/game-jump.png" });
const jumpInfo = await page.evaluate(() => window.__meshyChar?.currentClip);
console.log("jump clip", jumpInfo);

await browser.close();
