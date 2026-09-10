import { positionFloating, Rect } from "../positioning";

const VIEWPORT = { width: 1000, height: 800 };
const OPTIONS = { placement: "right" as const, offset: 8, padding: 8 };
const PANEL = { width: 200, height: 100 };

function anchorAt(x: number, y: number): Rect {
    return { x, y, width: 40, height: 40 };
}

describe("positionFloating", () => {
    it("places the panel on the preferred side when it fits", () => {
        const result = positionFloating(anchorAt(100, 300), PANEL, VIEWPORT, OPTIONS);
        expect(result.placement).toBe("right");
        expect(result.x).toBe(148);
        // Vertically centred on the anchor.
        expect(result.y).toBe(270);
    });

    it("flips to the opposite side when the preferred one would overflow", () => {
        const result = positionFloating(anchorAt(950, 300), PANEL, VIEWPORT, OPTIONS);
        expect(result.placement).toBe("left");
        expect(result.x).toBe(742);
    });

    it("flips a top placement down when there is no room above", () => {
        const result = positionFloating(anchorAt(100, 5), PANEL, VIEWPORT, { ...OPTIONS, placement: "top" });
        expect(result.placement).toBe("bottom");
        expect(result.y).toBe(53);
    });

    it("clamps into the viewport when neither side fits", () => {
        const shallow = { width: 1000, height: 150 };
        const result = positionFloating(anchorAt(100, 40), PANEL, shallow, { ...OPTIONS, placement: "top" });
        // Neither above nor below fits, so it stays on the preferred side and
        // is pulled back inside the viewport.
        expect(result.placement).toBe("top");
        expect(result.y).toBe(8);
    });

    it("keeps the panel on screen at the far edges", () => {
        const result = positionFloating(anchorAt(980, 780), PANEL, VIEWPORT, OPTIONS);
        expect(result.x).toBeGreaterThanOrEqual(8);
        expect(result.x + PANEL.width).toBeLessThanOrEqual(VIEWPORT.width - 8);
        expect(result.y + PANEL.height).toBeLessThanOrEqual(VIEWPORT.height - 8);
    });

    it("prefers the near edge for a panel larger than the viewport", () => {
        const huge = { width: 1400, height: 100 };
        const result = positionFloating(anchorAt(100, 300), huge, VIEWPORT, OPTIONS);
        expect(result.x).toBe(8);
    });
});
