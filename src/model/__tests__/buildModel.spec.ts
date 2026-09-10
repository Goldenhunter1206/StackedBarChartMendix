import { Big } from "big.js";
import { ObjectItem } from "mendix";

import { big, listAttribute, listExpression, listValue, objectItems } from "../../utils/testing/mendixMocks";
import { BuildModelProps, buildModel, buildSortSpecs, stringifyKey } from "../buildModel";

interface Row {
    bar: string;
    value: number;
    color: string;
    priority?: number;
}

const ROWS: Row[] = [
    { bar: "Mon", value: 3, color: "#ff0000", priority: 2 },
    { bar: "Tue", value: 5, color: "#00ff00", priority: 1 },
    { bar: "Mon", value: 2, color: "#00ff00", priority: 3 },
    { bar: "Mon", value: 4, color: "#ff0000", priority: 1 }
];

function props(rows: Row[], overrides: Partial<BuildModelProps> = {}): BuildModelProps {
    const items = objectItems(rows.length);
    const rowOf = (item: ObjectItem) => rows[items.indexOf(item)];

    return {
        datasource: listValue(items),
        barKeyAttribute: listAttribute<string>(item => rowOf(item).bar),
        valueAttribute: listAttribute<Big>(item => big(rowOf(item).value), { type: "Decimal" }),
        identityAttribute: undefined,
        labelTemplate: undefined,
        barsDatasource: undefined,
        barsKeyAttribute: undefined,
        barsLabelTemplate: undefined,
        showEmptyBars: true,
        colorMode: "expression",
        colorExpression: listExpression<string>(item => rowOf(item).color),
        colorAttribute: undefined,
        seriesAttribute: undefined,
        palette: "vivid",
        customPalette: "",
        sortKeys: [],
        colorOrderMode: "appearance",
        colorOrderList: "",
        barSortMode: "datasource",
        barSortDirection: "asc",
        ...overrides
    };
}

describe("buildModel", () => {
    it("groups elements into bars and totals them", () => {
        const model = buildModel(props(ROWS));

        expect(model.bars.map(b => b.key)).toEqual(["Mon", "Tue"]);
        expect(model.bars[0].elements).toHaveLength(3);
        expect(model.bars[0].total).toBe(9);
        expect(model.maxTotal).toBe(9);
        expect(model.elementCount).toBe(4);
    });

    it("never merges elements that share a colour", () => {
        const model = buildModel(props(ROWS));
        const monday = model.bars[0];
        const reds = monday.elements.filter(e => e.colorKey === "#ff0000");

        // Two separate red elements, kept as two nodes with their own values.
        expect(reds).toHaveLength(2);
        expect(reds.map(e => e.value).sort()).toEqual([3, 4]);
    });

    it("orders elements by colour by default, grouping identical colours together", () => {
        const model = buildModel(props(ROWS));
        expect(model.bars[0].elements.map(e => e.colorKey)).toEqual(["#ff0000", "#ff0000", "#00ff00"]);
    });

    it("sorts by a configured attribute after colour", () => {
        const rows = ROWS;
        const items = objectItems(rows.length);
        const priority = listAttribute<Big>(item => big(rows[items.indexOf(item)].priority ?? 0), {
            type: "Integer"
        });

        const model = buildModel(
            props(rows, {
                datasource: listValue(items),
                barKeyAttribute: listAttribute<string>(item => rows[items.indexOf(item)].bar),
                valueAttribute: listAttribute<Big>(item => big(rows[items.indexOf(item)].value), { type: "Decimal" }),
                colorExpression: listExpression<string>(item => rows[items.indexOf(item)].color),
                sortKeys: [
                    { sortSource: "color", sortAttribute: undefined, sortDirection: "asc" },
                    { sortSource: "attribute", sortAttribute: priority, sortDirection: "asc" }
                ]
            })
        );

        // Red first (first appearance), and within red, priority 1 before 2.
        expect(model.bars[0].elements.map(e => e.value)).toEqual([4, 3, 2]);
    });

    it("reads every Mendix accessor exactly once per element", () => {
        const items = objectItems(ROWS.length);
        const barKey = listAttribute<string>(item => ROWS[items.indexOf(item)].bar);
        const value = listAttribute<Big>(item => big(ROWS[items.indexOf(item)].value), { type: "Decimal" });
        const color = listExpression<string>(item => ROWS[items.indexOf(item)].color);

        buildModel(
            props(ROWS, {
                datasource: listValue(items),
                barKeyAttribute: barKey,
                valueAttribute: value,
                colorExpression: color
            })
        );

        // The guard for the whole performance design: one call per element per
        // accessor, never one per comparison or per render.
        expect(barKey.callCount).toBe(ROWS.length);
        expect(value.callCount).toBe(ROWS.length);
        expect(color.callCount).toBe(ROWS.length);
    });

    it("treats negative and missing values as zero", () => {
        const rows: Row[] = [{ bar: "A", value: -5, color: "#111" }];
        const model = buildModel(props(rows));
        expect(model.bars[0].total).toBe(0);
    });

    it("assigns palette colours per series in order of first appearance", () => {
        const rows: Row[] = [
            { bar: "A", value: 1, color: "" },
            { bar: "A", value: 1, color: "" },
            { bar: "B", value: 1, color: "" }
        ];
        const items = objectItems(rows.length);
        const series = ["x", "y", "x"];
        const model = buildModel(
            props(rows, {
                datasource: listValue(items),
                barKeyAttribute: listAttribute<string>(item => rows[items.indexOf(item)].bar),
                valueAttribute: listAttribute<Big>(item => big(1), { type: "Decimal" }),
                colorMode: "palette",
                seriesAttribute: listAttribute<string>(item => series[items.indexOf(item)])
            })
        );

        const colors = model.bars.flatMap(b => b.elements).map(e => e.color);
        // The two "x" rows share a colour; "y" gets its own.
        expect(new Set(colors).size).toBe(2);
    });

    describe("with a bars data source", () => {
        function withBars(showEmpty: boolean) {
            const barRows = ["Tue", "Mon", "Wed"];
            const barItems = objectItems(barRows.length, "bar");
            return buildModel(
                props(ROWS, {
                    barsDatasource: listValue(barItems),
                    barsKeyAttribute: listAttribute<string>(item => barRows[barItems.indexOf(item)]),
                    barsLabelTemplate: listExpression<string>(item => `Day ${barRows[barItems.indexOf(item)]}`),
                    showEmptyBars: showEmpty
                })
            );
        }

        it("takes bar order and captions from the bars list", () => {
            const model = withBars(false);
            expect(model.bars.map(b => b.key)).toEqual(["Tue", "Mon"]);
            expect(model.bars[0].label).toBe("Day Tue");
        });

        it("renders bars that hold no elements when asked to", () => {
            const model = withBars(true);
            expect(model.bars.map(b => b.key)).toEqual(["Tue", "Mon", "Wed"]);
            expect(model.bars[2].elements).toHaveLength(0);
            expect(model.bars[2].total).toBe(0);
        });
    });

    it("reports truncation so the chart can say so instead of lying", () => {
        const base = props(ROWS);
        // Reuse the same items so the accessors still resolve their rows.
        const model = buildModel({
            ...base,
            datasource: listValue(base.datasource.items!, { hasMoreItems: true, totalCount: 99 })
        });
        expect(model.truncated).toBe(true);
        expect(model.totalCount).toBe(99);
    });
});

describe("buildSortSpecs", () => {
    it("defaults to ordering by colour", () => {
        expect(buildSortSpecs({ sortKeys: [] })).toEqual([{ source: "color", direction: "asc", kind: "string" }]);
    });

    it("falls back to colour when an attribute key has no attribute selected", () => {
        const specs = buildSortSpecs({
            sortKeys: [{ sortSource: "attribute", sortAttribute: undefined, sortDirection: "desc" }]
        });
        expect(specs[0].source).toBe("color");
    });
});

describe("stringifyKey", () => {
    it("normalises every supported key type to a stable string", () => {
        expect(stringifyKey("Mon")).toBe("Mon");
        expect(stringifyKey(true)).toBe("true");
        expect(stringifyKey(big("42.50"))).toBe("42.5");
        expect(stringifyKey(new Date(Date.UTC(2026, 0, 2)))).toBe("2026-01-02T00:00:00.000Z");
        expect(stringifyKey(undefined)).toBe("");
    });
});
