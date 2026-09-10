import { chromium } from "playwright";
import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const server = await createServer({ configFile: resolve(here, "../vite.config.mts") });
await server.listen();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".sbc-seg");

const week = page.locator('[data-scenario="week"]');
const source = week.locator('.sbc-bar').nth(0).locator(".sbc-seg").nth(3); // top of Mon
const targetBar = week.locator('.sbc-bar').nth(3);                        // Thu

const from = await source.boundingBox();
const to = await targetBar.boundingBox();

await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await page.mouse.down();
await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 3 });
await page.waitForTimeout(120);
const ghostVisible = (await page.locator(".sbc-ghost").count()) > 0;

// Move over the middle of the Thu bar.
await page.mouse.move(to.x + to.width / 2, to.y + to.height * 0.6, { steps: 10 });
await page.waitForTimeout(200);
const dropHighlight = (await week.locator(".sbc-bar--drop-target").count()) > 0;
await week.screenshot({ path: resolve(here, "screenshots/drag.png") });

const before = await week.evaluate(el =>
    [...el.querySelectorAll(".sbc-bar")].map(b => b.querySelectorAll(".sbc-seg").length)
);

await page.mouse.up();
await page.waitForTimeout(300);

const after = await week.evaluate(el =>
    [...el.querySelectorAll(".sbc-bar")].map(b => b.querySelectorAll(".sbc-seg").length)
);
const dropEvent = await page.locator(".toolbar span").first().innerText();
const ghostGone = (await page.locator(".sbc-ghost").count()) === 0;
const menuOpened = (await page.locator(".sbc-menu").count()) > 0;

console.log(JSON.stringify({ ghostVisible, dropHighlight, before, after, dropEvent, ghostGone, menuOpenedAfterDrag: menuOpened, errors }, null, 2));
await browser.close();
await server.close();
