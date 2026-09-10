import { chromium } from "playwright";
import { createServer } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const server = await createServer({ configFile: resolve(here, "../vite.config.mts") });
await server.listen();
const url = `http://localhost:${server.config.server.port}/`;

// The environment ships a Chromium build that this Playwright version does
// not resolve by default, so point at it explicitly.
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => m.type() === "error" && errors.push(m.text()));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector(".sbc-seg", { timeout: 15000 });
await page.waitForTimeout(600);

const shots = process.argv.slice(2);
for (const name of shots.length ? shots : ["week", "sorted", "percentage", "dense"]) {
    const section = page.locator(`[data-scenario="${name}"]`);
    if (await section.count()) {
        await section.scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await section.screenshot({ path: resolve(here, `screenshots/${name}.png`) });
    }
}

const stats = await page.evaluate(() => {
    const dense = document.querySelector('[data-scenario="dense"] .sbc');
    return {
        totalSegments: document.querySelectorAll(".sbc-seg").length,
        denseMountedBars: dense ? dense.querySelectorAll(".sbc-bar").length : 0,
        denseMountedSegments: dense ? dense.querySelectorAll(".sbc-seg").length : 0
    };
});

console.log(JSON.stringify({ stats, errors }, null, 2));
await browser.close();
await server.close();
