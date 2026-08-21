import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (err) => errors.push("page " + String(err?.message || err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForTimeout(4000);
await page.getByRole("button", { name: /Warrior/i }).first().click({ noWaitAfter: true, force: true });
await page.waitForTimeout(6000);
const text = await page.locator("body").innerText();
console.log(JSON.stringify({ errors, text: text.slice(0, 900) }, null, 2));
await browser.close();
