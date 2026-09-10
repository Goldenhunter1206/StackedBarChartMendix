import { buildScale, formatTick, niceCeil } from "../scale";

describe("niceCeil", () => {
    it.each([
        [0.7, 1],
        [1, 1],
        [1.1, 2],
        [2.4, 2.5],
        [3, 5],
        [7, 10],
        [23, 25],
        [180, 200]
    ])("rounds %p up to %p", (input, expected) => {
        expect(niceCeil(input)).toBeCloseTo(expected, 10);
    });

    it("returns zero for non-positive input", () => {
        expect(niceCeil(0)).toBe(0);
        expect(niceCeil(-5)).toBe(0);
    });
});

describe("buildScale", () => {
    it("produces a usable axis for empty data", () => {
        expect(buildScale(0)).toEqual({ axisMax: 1, ticks: [0, 1] });
    });

    it("covers the maximum total", () => {
        const scale = buildScale(97);
        expect(scale.axisMax).toBeGreaterThanOrEqual(97);
        expect(scale.ticks[0]).toBe(0);
        expect(scale.ticks[scale.ticks.length - 1]).toBeCloseTo(scale.axisMax, 10);
    });

    it("emits evenly spaced ticks free of floating point noise", () => {
        const scale = buildScale(0.3);
        // Repeated addition of 0.1 would surface here as 0.30000000000000004.
        expect(scale.ticks).toEqual([0, 0.1, 0.2, 0.3]);
    });

    it("keeps the axis stable across small changes in the maximum", () => {
        expect(buildScale(101).axisMax).toBe(buildScale(119).axisMax);
    });
});

describe("formatTick", () => {
    it.each([
        [500, "500"],
        [12_000, "12k"],
        [2_500_000, "2.5M"],
        [3_000_000_000, "3B"]
    ])("formats %p as %p", (input, expected) => {
        expect(formatTick(input)).toBe(expected);
    });
});
