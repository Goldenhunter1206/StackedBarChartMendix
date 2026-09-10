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

console.log(JSON.stringify(await page.evaluate(() => {
    const section = document.querySelector('[data-scenario="week"]');
    const scroll = section.querySelector(".sbc-scroll");
    const canvas = section.querySelector(".sbc-canvas");
    const bar = section.querySelector(".sbc-bar");
    const stack = bar.querySelector(".sbc-bar-stack");
    const segs = [...bar.querySelectorAll(".sbc-seg")];
    const r = el => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
    return {
        scrollBox: r(scroll),
        scrollClientH: scroll.clientHeight,
        scrollOffsetH: scroll.offsetHeight,
        canvasBox: r(canvas),
        stackBox: r(stack),
        segs: segs.map(r),
        cs: { canvasHeight: getComputedStyle(canvas).height, stackTop: getComputedStyle(stack).top, stackHeight: getComputedStyle(stack).height }
    };
}), null, 2));

await browser.close();
await server.close();
