/**
 * Colour resolution for chart elements.
 *
 * Nothing here touches React or the Mendix API: it takes plain strings and
 * returns plain strings, which keeps it cheap to unit test.
 */

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

export const PALETTES: Record<string, string[]> = {
    vivid: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#84cc16", "#ec4899"],
    pastel: ["#a5b4fc", "#86efac", "#fcd34d", "#fca5a5", "#67e8f9", "#d8b4fe", "#bef264", "#f9a8d4"],
    cool: ["#0ea5e9", "#6366f1", "#14b8a6", "#8b5cf6", "#06b6d4", "#3b82f6", "#2dd4bf", "#a78bfa"],
    warm: ["#f97316", "#ef4444", "#f59e0b", "#e11d48", "#fb923c", "#dc2626", "#fbbf24", "#f43f5e"]
};

export const FALLBACK_COLOR = "#94a3b8";

/** Splits a comma separated list of colours, dropping blank entries. */
export function parsePaletteList(list: string): string[] {
    return list
        .split(",")
        .map(entry => entry.trim())
        .filter(entry => entry.length > 0);
}

export function resolvePalette(palette: string, customPalette: string): string[] {
    if (palette === "custom") {
        const custom = parsePaletteList(customPalette);
        return custom.length > 0 ? custom : PALETTES.vivid;
    }
    return PALETTES[palette] ?? PALETTES.vivid;
}

/**
 * Canonical form of a colour string, used for equality and ranking.
 *
 * This deliberately does not resolve colours to RGB: two spellings of the same
 * colour rank separately, which is far cheaper and matches what a modeller sees
 * when they write the expression.
 */
export function normalizeColor(color: string): string {
    const trimmed = color.trim().toLowerCase();
    // Expand #abc to #aabbcc so the two spellings compare equal.
    if (/^#[0-9a-f]{3}$/.test(trimmed)) {
        return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
}

const HEX_RE = /^#([0-9a-f]{6})([0-9a-f]{2})?$/;
const RGB_RE = /^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/;

/**
 * Best-effort parse of a CSS colour into RGB.
 *
 * Hex and rgb()/rgba() are handled directly. Anything else (named colours,
 * hsl(), oklch(), colour functions) is handed to the browser once and cached,
 * so exotic values still produce readable labels without shipping a CSS colour
 * parser. Returns undefined when there is no DOM to ask.
 */
export function parseColor(color: string): Rgb | undefined {
    const normalized = normalizeColor(color);

    const hex = HEX_RE.exec(normalized);
    if (hex) {
        const digits = hex[1];
        return {
            r: parseInt(digits.slice(0, 2), 16),
            g: parseInt(digits.slice(2, 4), 16),
            b: parseInt(digits.slice(4, 6), 16)
        };
    }

    const rgb = RGB_RE.exec(normalized);
    if (rgb) {
        return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
    }

    return resolveViaDom(normalized);
}

const domCache = new Map<string, Rgb | undefined>();
let probe: HTMLElement | undefined;

function resolveViaDom(color: string): Rgb | undefined {
    if (domCache.has(color)) {
        return domCache.get(color);
    }
    let result: Rgb | undefined;
    if (typeof document !== "undefined") {
        if (!probe) {
            probe = document.createElement("span");
            probe.style.display = "none";
            document.body.appendChild(probe);
        }
        probe.style.color = "";
        probe.style.color = color;
        // An invalid colour leaves the property empty, so there is nothing to read back.
        if (probe.style.color !== "") {
            const computed = getComputedStyle(probe).color;
            const rgb = RGB_RE.exec(computed);
            if (rgb) {
                result = { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
            }
        }
    }
    domCache.set(color, result);
    return result;
}

/** Clears the cached DOM colour probe. Exposed for tests. */
export function resetColorCache(): void {
    domCache.clear();
    probe?.remove();
    probe = undefined;
}

function channelLuminance(channel: number): number {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
    return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
}

/**
 * Picks a readable label colour for text drawn on top of `background`.
 * Falls back to the dark ink when the background cannot be parsed.
 */
export function contrastTextColor(background: string): string {
    const rgb = parseColor(background);
    if (!rgb) {
        return "#0f172a";
    }
    return relativeLuminance(rgb) > 0.45 ? "#0f172a" : "#ffffff";
}

/**
 * Builds a colour -> rank lookup used when sorting by colour.
 *
 * `appearance` ranks colours by where they are first seen in the data, which is
 * stable and — importantly — identical in every bar, so a given colour occupies
 * the same relative position throughout the chart.
 */
export function buildColorRanker(
    mode: "appearance" | "value" | "custom",
    customOrder: string
): { rank: (color: string) => number } {
    if (mode === "custom") {
        const ranks = new Map<string, number>();
        parsePaletteList(customOrder).forEach((color, index) => ranks.set(normalizeColor(color), index));
        // Colours that were not listed sort after every listed colour.
        return { rank: color => ranks.get(normalizeColor(color)) ?? Number.MAX_SAFE_INTEGER };
    }

    if (mode === "value") {
        return { rank: () => 0 };
    }

    const seen = new Map<string, number>();
    return {
        rank(color) {
            const key = normalizeColor(color);
            let rank = seen.get(key);
            if (rank === undefined) {
                rank = seen.size;
                seen.set(key, rank);
            }
            return rank;
        }
    };
}
