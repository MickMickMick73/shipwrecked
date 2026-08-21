import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

mkdirSync("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(20000);
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("ERR", msg.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector("canvas", { timeout: 15000 });
await page.waitForTimeout(2500);

try {
  await page.screenshot({ path: "/workspace/screenshots/palms-wide.png", timeout: 8000 });
  console.log("wide ok");
} catch (e) {
  console.log("wide fail", e.message);
}

const info = await page.evaluate(() => {
  const g = window.__lagoon;
  const p = g?.palms?.children?.[0];
  const f = p?.userData?.fronds?.[0];
  return {
    palms: g?.palms?.children?.length ?? 0,
    restZ: f?.userData?.restZ,
    rotZ: f?.rotation?.z,
    order: f?.rotation?.order,
  };
});
console.log("palms", JSON.stringify(info));

await page.mouse.move(640, 400);
for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -200);
await page.waitForTimeout(600);
try {
  await page.screenshot({ path: "/workspace/screenshots/palms-zoom.png", timeout: 8000 });
  console.log("zoom ok");
} catch (e) {
  console.log("zoom fail", e.message);
}

await browser.close();
console.log("done");
