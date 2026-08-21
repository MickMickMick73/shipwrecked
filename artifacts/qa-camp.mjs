import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (err) => errors.push("page " + String(err?.message || err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.setDefaultTimeout(20000);
await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForTimeout(5000);
try {
  await page.screenshot({ path: "/workspace/screenshots/camp-title.png", timeout: 8000 });
  console.log("title ok");
} catch (e) {
  console.log("title fail", e.message);
}
await page.getByRole("button", { name: /Warrior/i }).first().click({ noWaitAfter: true, force: true });
await page.waitForTimeout(8000);
try {
  await page.screenshot({ path: "/workspace/screenshots/camp-play.png", timeout: 8000 });
  console.log("play ok");
} catch (e) {
  console.log("play fail", e.message);
}
console.log(JSON.stringify({ errors: errors.slice(0, 15), body: (await page.locator("body").innerText()).slice(0, 600) }));
await browser.close();
