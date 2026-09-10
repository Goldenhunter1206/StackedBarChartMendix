import { chromium } from "playwright";
import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
const here = dirname(fileURLToPath(import.meta.url));
const server = await createServer({ configFile: resolve(here, "../vite.config.mts") });
await server.listen();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1240, height: 900 } });
await page.goto(`http://localhost:${server.config.server.port}/`, { waitUntil: "networkidle" });
await page.waitForSelector(".sbc-seg");
console.log(await page.evaluate(() =>
    [...document.querySelectorAll('[data-scenario="week"] .sbc-legend-item')].map(el => el.textContent.trim()).join(" | ")
));
await browser.close();
await server.close();
