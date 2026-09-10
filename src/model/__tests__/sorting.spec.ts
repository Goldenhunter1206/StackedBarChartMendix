import { Big } from "big.js";

import { createBarComparator, createElementComparator } from "../sorting";
import { ChartBar, ChartElement, SortSpec } from "../types";

function element(overrides: Partial<ChartElement>): ChartElement {
    return {
        key: "k",
        item: { id: "o" } as ChartElement["item"],
        barKey: "bar",
        value: 1,
        color: "#111111",
        colorKey: "#111111",
        colorRank: 0,
        sortValues: [],
        sourceIndex: 0,
        ...overrides
    };
}

function sortWith(specs: SortSpec[], elements: ChartElement[], colorMode: "appearance" | "value" = "appearance") {
    return [...elements].sort(createElementComparator(specs, colorMode)).map(e => e.key);
}

describe("createElementComparator", () => {
    it("orders by colour rank, then falls back to data source order", () => {
        const specs: SortSpec[] = [{ source: "color", direction: "asc", kind: "string" }];
        const elements = [
            element({ key: "b", colorRank: 1, sourceIndex: 0 }),
            element({ key: "a", colorRank: 0, sourceIndex: 1 }),
            element({ key: "c", colorRank: 1, sourceIndex: 2 })
        ];
        expect(sortWith(specs, elements)).toEqual(["a", "b", "c"]);
    });

    it("compares decimals exactly rather than through floating point", () => {
        const specs: SortSpec[] = [{ source: "attribute", direction: "asc", kind: "big" }];
        // These two differ only past the 17th significant digit, where Number
        // would collapse them into a tie.
        const elements = [
            element({ key: "high", sortValues: [new Big("1.00000000000000002")], sourceIndex: 0 }),
            element({ key: "low", sortValues: [new Big("1.00000000000000001")], sourceIndex: 1 })
        ];
        expect(sortWith(specs, elements)).toEqual(["low", "high"]);
    });

    it("sorts strings with natural number ordering", () => {
        const specs: SortSpec[] = [{ source: "attribute", direction: "asc", kind: "string" }];
        const elements = [
            element({ key: "10", sortValues: ["item 10"], sourceIndex: 0 }),
            element({ key: "2", sortValues: ["item 2"], sourceIndex: 1 })
        ];
        expect(sortWith(specs, elements)).toEqual(["2", "10"]);
    });

    it("keeps empty values last in both directions", () => {
        const asc: SortSpec[] = [{ source: "attribute", direction: "asc", kind: "number" }];
        const desc: SortSpec[] = [{ source: "attribute", direction: "desc", kind: "number" }];
        const elements = [
            element({ key: "empty", sortValues: [undefined], sourceIndex: 0 }),
            element({ key: "one", sortValues: [1], sourceIndex: 1 }),
            element({ key: "two", sortValues: [2], sourceIndex: 2 })
        ];
        expect(sortWith(asc, elements)).toEqual(["one", "two", "empty"]);
        expect(sortWith(desc, elements)).toEqual(["two", "one", "empty"]);
    });

    it("applies sort keys in order", () => {
        const specs: SortSpec[] = [
            { source: "attribute", direction: "asc", kind: "number" },
            { source: "attribute", direction: "desc", kind: "string" }
        ];
        const elements = [
            element({ key: "a", sortValues: [1, "alpha"], sourceIndex: 0 }),
            element({ key: "b", sortValues: [1, "beta"], sourceIndex: 1 }),
            element({ key: "c", sortValues: [0, "gamma"], sourceIndex: 2 })
        ];
        expect(sortWith(specs, elements)).toEqual(["c", "b", "a"]);
    });

    it("is a total order, so equal elements keep data source order", () => {
        const specs: SortSpec[] = [{ source: "attribute", direction: "desc", kind: "number" }];
        const elements = [
            element({ key: "first", sortValues: [5], sourceIndex: 0 }),
            element({ key: "second", sortValues: [5], sourceIndex: 1 }),
            element({ key: "third", sortValues: [5], sourceIndex: 2 })
        ];
        expect(sortWith(specs, elements)).toEqual(["first", "second", "third"]);
    });

    it("ranks colours lexicographically when the colour order is 'value'", () => {
        const specs: SortSpec[] = [{ source: "color", direction: "asc", kind: "string" }];
        const elements = [
            element({ key: "red", colorKey: "#ff0000", colorRank: 0, sourceIndex: 0 }),
            element({ key: "blue", colorKey: "#0000ff", colorRank: 1, sourceIndex: 1 })
        ];
        expect(sortWith(specs, elements, "value")).toEqual(["blue", "red"]);
    });
});

describe("createBarComparator", () => {
    function bar(key: string, index: number, total: number, count = 0): ChartBar {
        return { key, label: key, elements: new Array(count).fill(undefined), total, index };
    }

    it("preserves discovery order for the datasource mode", () => {
        const bars = [bar("c", 2, 1), bar("a", 0, 3), bar("b", 1, 2)];
        bars.sort(createBarComparator("datasource", "asc"));
        expect(bars.map(b => b.key)).toEqual(["a", "b", "c"]);
    });

    it("reverses discovery order when descending", () => {
        const bars = [bar("a", 0, 3), bar("b", 1, 2), bar("c", 2, 1)];
        bars.sort(createBarComparator("datasource", "desc"));
        expect(bars.map(b => b.key)).toEqual(["c", "b", "a"]);
    });

    it("orders by total", () => {
        const bars = [bar("a", 0, 3), bar("b", 1, 9), bar("c", 2, 1)];
        bars.sort(createBarComparator("total", "desc"));
        expect(bars.map(b => b.key)).toEqual(["b", "a", "c"]);
    });
});
