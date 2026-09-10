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

const panel = page.locator('[data-scenario="confirm"]');
await panel.scrollIntoViewIfNeeded();

async function dragTo(sourceIdx, targetBarIdx) {
    const source = panel.locator(".sbc-bar").nth(0).locator(".sbc-seg").nth(sourceIdx);
    const target = panel.locator(".sbc-bar").nth(targetBarIdx);
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 3 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height * 0.6, { steps: 8 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(200);
}

const counts = () => panel.evaluate(el => [...el.querySelectorAll(".sbc-bar")].map(b => b.querySelectorAll(".sbc-seg").length));

const initial = await counts();

// --- cancel path
await dragTo(0, 2);
const dialogShown = (await page.locator(".sbc-dialog").count()) > 0;
const dialogText = dialogShown ? (await page.locator(".sbc-dialog").innerText()).replace(/\n/g, " | ") : "";
await page.screenshot({ path: resolve(here, "screenshots/confirm.png"), clip: await panel.boundingBox() });
await page.locator(".sbc-dialog-cancel").click();
await page.waitForTimeout(400);
const afterCancel = await counts();

// --- confirm path
await dragTo(0, 2);
await page.locator(".sbc-dialog-confirm").click();
await page.waitForTimeout(400);
const afterConfirm = await counts();

console.log(JSON.stringify({ dialogShown, dialogText, initial, afterCancel, afterConfirm, errors }, null, 2));
await browser.close();
await server.close();
