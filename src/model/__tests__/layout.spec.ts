import { barIndexAt, dropIndexAt, layoutChart, LayoutOptions } from "../layout";
import { ChartBar, ChartElement, ChartModel } from "../types";

function element(key: string, value: number, color = "#111111"): ChartElement {
    return {
        key,
        item: { id: key } as ChartElement["item"],
        barKey: "bar",
        value,
        color,
        colorKey: color,
        colorRank: 0,
        sortValues: [],
        sourceIndex: 0
    };
}

function model(bars: Array<{ key: string; values: number[] }>): ChartModel {
    const chartBars: ChartBar[] = bars.map((b, index) => {
        const elements = b.values.map((v, i) => element(`${b.key}-${i}`, v));
        return {
            key: b.key,
            label: b.key,
            elements,
            total: elements.reduce((sum, e) => sum + e.value, 0),
            index
        };
    });
    return {
        bars: chartBars,
        legend: [],
        maxTotal: Math.max(0, ...chartBars.map(b => b.total)),
        elementCount: chartBars.reduce((n, b) => n + b.elements.length, 0),
        truncated: false
    };
}

const OPTIONS: LayoutOptions = {
    plotHeight: 400,
    barWidth: 50,
    barGap: 10,
    segmentGap: 0,
    stackMode: "absolute",
    sliverThreshold: 2,
    sliverClustering: false
};

describe("layoutChart", () => {
    it("stacks elements bottom-up without overlap", () => {
        const layout = layoutChart(model([{ key: "a", values: [10, 20, 30] }]), OPTIONS);
        const nodes = layout.bars[0].nodes;

        expect(nodes).toHaveLength(3);
        for (let i = 1; i < nodes.length; i++) {
            expect(nodes[i].y).toBeCloseTo(nodes[i - 1].y + nodes[i - 1].height, 6);
        }
        expect(nodes[0].y).toBe(0);
    });

    it("scales heights against the shared axis so bars stay comparable", () => {
        const layout = layoutChart(model([{ key: "a", values: [50] }, { key: "b", values: [100] }]), OPTIONS);
        const [a, b] = layout.bars;
        expect(b.stackHeight).toBeCloseTo(a.stackHeight * 2, 6);
    });

    it("keeps every bar full height in percentage mode", () => {
        const layout = layoutChart(model([{ key: "a", values: [1, 1] }, { key: "b", values: [10] }]), {
            ...OPTIONS,
            stackMode: "percentage"
        });
        expect(layout.bars[0].stackHeight).toBeCloseTo(400, 6);
        expect(layout.bars[1].stackHeight).toBeCloseTo(400, 6);
        expect(layout.bars[0].nodes[0].height).toBeCloseTo(200, 6);
    });

    it("absorbs gaps so a gapped bar is not taller than its value", () => {
        const withoutGaps = layoutChart(model([{ key: "a", values: [10, 10, 10] }]), OPTIONS);
        const withGaps = layoutChart(model([{ key: "a", values: [10, 10, 10] }]), { ...OPTIONS, segmentGap: 4 });

        const totalHeight = (bars: typeof withGaps.bars) => {
            const nodes = bars[0].nodes;
            const last = nodes[nodes.length - 1];
            return last.y + last.height;
        };
        expect(totalHeight(withGaps.bars)).toBeCloseTo(totalHeight(withoutGaps.bars), 6);
    });

    it("renders an empty bar as no nodes rather than crashing", () => {
        const layout = layoutChart(model([{ key: "empty", values: [] }]), OPTIONS);
        expect(layout.bars[0].nodes).toEqual([]);
        expect(layout.bars[0].stackHeight).toBe(0);
    });

    describe("sliver clustering", () => {
        const tiny = { key: "a", values: [100, ...new Array(20).fill(0.05), 100] };

        it("is off by default, so every element keeps its own node", () => {
            const layout = layoutChart(model([tiny]), OPTIONS);
            expect(layout.bars[0].nodes).toHaveLength(22);
        });

        it("collapses only runs of unrenderable elements when enabled", () => {
            const layout = layoutChart(model([tiny]), { ...OPTIONS, sliverClustering: true });
            const nodes = layout.bars[0].nodes;

            expect(nodes).toHaveLength(3);
            expect(nodes[1].count).toBe(20);
            expect(nodes[1].members).toHaveLength(20);
            // The two full-size elements are untouched.
            expect(nodes[0].count).toBe(1);
            expect(nodes[2].count).toBe(1);
        });
    });
});

describe("barIndexAt", () => {
    const layout = layoutChart(model([{ key: "a", values: [1] }, { key: "b", values: [1] }, { key: "c", values: [1] }]), OPTIONS);

    it("maps a pointer position to its column", () => {
        expect(barIndexAt(layout, 5, OPTIONS)).toBe(0);
        expect(barIndexAt(layout, 65, OPTIONS)).toBe(1);
        expect(barIndexAt(layout, 125, OPTIONS)).toBe(2);
    });

    it("clamps outside the content", () => {
        expect(barIndexAt(layout, -50, OPTIONS)).toBe(0);
        expect(barIndexAt(layout, 9999, OPTIONS)).toBe(2);
    });
});

describe("dropIndexAt", () => {
    const layout = layoutChart(model([{ key: "a", values: [10, 10, 10] }]), OPTIONS);
    const bar = layout.bars[0];

    it("inserts above an element when the pointer is past its midpoint", () => {
        // Each node is 400/30*10 = 133.33px tall.
        expect(dropIndexAt(bar, 0)).toBe(0);
        expect(dropIndexAt(bar, 60)).toBe(0);
        expect(dropIndexAt(bar, 100)).toBe(1);
        expect(dropIndexAt(bar, 240)).toBe(2);
    });

    it("returns the end of the stack above the last element", () => {
        expect(dropIndexAt(bar, 400)).toBe(3);
    });

    it("returns index 0 for an empty bar", () => {
        const empty = layoutChart(model([{ key: "e", values: [] }]), OPTIONS).bars[0];
        expect(dropIndexAt(empty, 123)).toBe(0);
    });
});
