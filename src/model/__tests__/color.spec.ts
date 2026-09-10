import { buildColorRanker, contrastTextColor, normalizeColor, parsePaletteList, resolvePalette } from "../color";

describe("normalizeColor", () => {
    it("expands short hex so both spellings compare equal", () => {
        expect(normalizeColor("#ABC")).toBe("#aabbcc");
        expect(normalizeColor("#aabbcc")).toBe("#aabbcc");
    });

    it("lowercases and trims", () => {
        expect(normalizeColor("  #FF0000 ")).toBe("#ff0000");
    });
});

describe("resolvePalette", () => {
    it("falls back to the built-in palette when the custom list is blank", () => {
        expect(resolvePalette("custom", "   ")).toEqual(resolvePalette("vivid", ""));
    });

    it("parses a custom list", () => {
        expect(parsePaletteList("#111, #222 ,, #333")).toEqual(["#111", "#222", "#333"]);
    });
});

describe("buildColorRanker", () => {
    it("ranks by first appearance, consistently for repeat colours", () => {
        const ranker = buildColorRanker("appearance", "");
        expect(ranker.rank("#ff0000")).toBe(0);
        expect(ranker.rank("#00ff00")).toBe(1);
        expect(ranker.rank("#ff0000")).toBe(0);
        // Different spelling of the same colour must not open a new rank.
        expect(ranker.rank("#F00")).toBe(0);
    });

    it("uses the configured order and puts unlisted colours last", () => {
        const ranker = buildColorRanker("custom", "#00ff00,#ff0000");
        expect(ranker.rank("#00ff00")).toBe(0);
        expect(ranker.rank("#ff0000")).toBe(1);
        expect(ranker.rank("#0000ff")).toBe(Number.MAX_SAFE_INTEGER);
    });
});

describe("contrastTextColor", () => {
    it("picks dark ink on light backgrounds and light ink on dark ones", () => {
        expect(contrastTextColor("#ffffff")).toBe("#0f172a");
        expect(contrastTextColor("#000000")).toBe("#ffffff");
        expect(contrastTextColor("rgb(250, 250, 250)")).toBe("#0f172a");
    });

    it("falls back to dark ink for colours it cannot parse", () => {
        expect(contrastTextColor("not-a-colour")).toBe("#0f172a");
    });
});
