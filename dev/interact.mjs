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
const seg = week.locator(".sbc-seg").nth(3);

// --- hover -> tooltip
await seg.hover();
await page.waitForSelector(".sbc-tooltip", { timeout: 4000 });
const tooltipText = (await page.locator(".sbc-tooltip").innerText()).replace(/\n/g, " | ");
await week.screenshot({ path: resolve(here, "screenshots/tooltip.png") });

// --- click -> menu
await seg.click();
await page.waitForSelector(".sbc-menu", { timeout: 4000 });
const menuText = (await page.locator(".sbc-menu").innerText()).replace(/\n/g, " | ");
await week.screenshot({ path: resolve(here, "screenshots/menu.png") });

// --- menu item fires the Mendix action
await page.locator(".sbc-menu-item").first().click();
await page.waitForTimeout(200);
const eventText = await page.locator(".toolbar span").first().innerText();
const menuClosed = (await page.locator(".sbc-menu").count()) === 0;

// --- add button fires with action variables
await week.locator(".sbc-bar").first().hover();
await week.locator(".sbc-add").first().click();
await page.waitForTimeout(200);
const addEvent = await page.locator(".toolbar span").first().innerText();

// --- keyboard: focus an element and arrow around
await week.locator(".sbc-seg").nth(0).focus();
await page.keyboard.press("ArrowUp");
await page.waitForTimeout(150);
const focusMoved = await page.evaluate(() => document.activeElement?.getAttribute("data-el"));
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
const menuFromKeyboard = (await page.locator(".sbc-menu").count()) > 0;

console.log(JSON.stringify({ tooltipText, menuText, eventText, menuClosed, addEvent, focusMoved, menuFromKeyboard, errors }, null, 2));
await browser.close();
await server.close();
