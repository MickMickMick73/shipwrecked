import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("text=Warrior", { timeout: 20000 });
await page.waitForTimeout(2500);
const s = await page.context().newCDPSession(page);
const a = await s.send("Page.captureScreenshot", { format: "png" });
writeFileSync("/workspace/screenshots/hero-mobile.png", Buffer.from(a.data, "base64"));
console.log("ok", (await page.locator("body").innerText()).includes("Warrior"));
await browser.close();
