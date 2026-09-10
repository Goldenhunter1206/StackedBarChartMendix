import {
    applyMove,
    describeMove,
    fractionalSequence,
    isNoOp,
    needsRenumber,
    normalizeDropIndex
} from "../dragModel";
import { ChartBar, ChartElement, ChartModel } from "../types";

function element(key: string, value = 1): ChartElement {
    return {
        key,
        item: { id: key } as ChartElement["item"],
        barKey: "",
        value,
        color: "#111111",
        colorKey: "#111111",
        colorRank: 0,
        sortValues: [],
        sourceIndex: 0
    };
}

function model(spec: Record<string, string[]>): ChartModel {
    const bars: ChartBar[] = Object.entries(spec).map(([key, keys], index) => {
        const elements = keys.map(k => ({ ...element(k), barKey: key }));
        return {
            key,
            label: key,
            elements,
            total: elements.reduce((sum, e) => sum + e.value, 0),
            index
        };
    });
    return {
        bars,
        legend: [],
        maxTotal: Math.max(0, ...bars.map(b => b.total)),
        elementCount: bars.reduce((n, b) => n + b.elements.length, 0),
        truncated: false
    };
}

const shape = (m: ChartModel): Record<string, string[]> =>
    Object.fromEntries(m.bars.map(bar => [bar.key, bar.elements.map(e => e.key)]));

describe("normalizeDropIndex", () => {
    it("compensates for the dragged element still being in its own bar", () => {
        // Dragging index 0 to raw index 2 within the same bar of 3 means
        // "after the element currently at 1", i.e. final index 1.
        expect(normalizeDropIndex(2, true, 0, 3)).toBe(1);
    });

    it("leaves cross-bar drops alone", () => {
        expect(normalizeDropIndex(2, false, 0, 3)).toBe(2);
    });

    it("clamps into range", () => {
        expect(normalizeDropIndex(99, false, 0, 3)).toBe(3);
        expect(normalizeDropIndex(-5, false, 0, 3)).toBe(0);
    });
});

describe("describeMove", () => {
    const base = model({ a: ["a1", "a2", "a3"], b: ["b1"] });

    it("reports the neighbours the element will land between", () => {
        const move = describeMove(base, "b1", { barKey: "a", index: 2 })!;
        expect(move.previous?.key).toBe("a2");
        expect(move.next?.key).toBe("a3");
        expect(move.sourceBarKey).toBe("b");
        expect(move.targetBarKey).toBe("a");
    });

    it("excludes the dragged element when reordering inside its own bar", () => {
        const move = describeMove(base, "a1", { barKey: "a", index: 1 })!;
        // With a1 lifted out, position 1 sits between a2 and a3.
        expect(move.previous?.key).toBe("a2");
        expect(move.next?.key).toBe("a3");
    });

    it("has no neighbour below when dropped at the bottom", () => {
        const move = describeMove(base, "b1", { barKey: "a", index: 0 })!;
        expect(move.previous).toBeUndefined();
        expect(move.next?.key).toBe("a1");
    });

    it("has no neighbour above when dropped on top", () => {
        const move = describeMove(base, "b1", { barKey: "a", index: 3 })!;
        expect(move.previous?.key).toBe("a3");
        expect(move.next).toBeUndefined();
    });

    it("returns null for an unknown element", () => {
        expect(describeMove(base, "nope", { barKey: "a", index: 0 })).toBeNull();
    });

    it("detects a move that changes nothing", () => {
        expect(isNoOp(describeMove(base, "a2", { barKey: "a", index: 1 })!)).toBe(true);
        expect(isNoOp(describeMove(base, "a2", { barKey: "a", index: 2 })!)).toBe(false);
    });
});

describe("applyMove", () => {
    it("moves an element between bars and updates both totals", () => {
        const base = model({ a: ["a1", "a2"], b: ["b1"] });
        const moved = applyMove(base, describeMove(base, "a1", { barKey: "b", index: 1 })!);

        expect(shape(moved)).toEqual({ a: ["a2"], b: ["b1", "a1"] });
        expect(moved.bars[0].total).toBe(1);
        expect(moved.bars[1].total).toBe(2);
        expect(moved.maxTotal).toBe(2);
    });

    it("reorders inside a bar without duplicating the element", () => {
        const base = model({ a: ["a1", "a2", "a3"] });
        const moved = applyMove(base, describeMove(base, "a1", { barKey: "a", index: 2 })!);

        expect(shape(moved)).toEqual({ a: ["a2", "a3", "a1"] });
        expect(moved.bars[0].elements).toHaveLength(3);
    });

    it("leaves uninvolved bars identical, so their components can skip re-rendering", () => {
        const base = model({ a: ["a1"], b: ["b1"], c: ["c1"] });
        const moved = applyMove(base, describeMove(base, "a1", { barKey: "b", index: 0 })!);

        expect(moved.bars[2]).toBe(base.bars[2]);
        expect(moved.bars[0]).not.toBe(base.bars[0]);
    });

    it("retags the moved element with its new bar", () => {
        const base = model({ a: ["a1"], b: [] });
        const moved = applyMove(base, describeMove(base, "a1", { barKey: "b", index: 0 })!);
        expect(moved.bars[1].elements[0].barKey).toBe("b");
    });
});

describe("fractionalSequence", () => {
    it("lands strictly between two neighbours", () => {
        expect(fractionalSequence(10, 20)).toBe(15);
    });

    it("steps outside when there is only one neighbour", () => {
        expect(fractionalSequence(undefined, 10)).toBe(9);
        expect(fractionalSequence(10, undefined)).toBe(11);
    });

    it("starts at zero in an empty bar", () => {
        expect(fractionalSequence(undefined, undefined)).toBe(0);
    });

    it("only writes the element that moved", () => {
        // Repeated inserts between the same pair keep working without
        // renumbering anything else.
        let low = 0;
        const high = 1;
        for (let i = 0; i < 10; i++) {
            const next = fractionalSequence(low, high);
            expect(next).toBeGreaterThan(low);
            expect(next).toBeLessThan(high);
            low = next;
        }
    });
});

describe("needsRenumber", () => {
    it("is false for ordinary gaps", () => {
        expect(needsRenumber(1, 2)).toBe(false);
    });

    it("is true once the gap is below float precision", () => {
        expect(needsRenumber(1, 1 + Number.EPSILON)).toBe(true);
    });
});
