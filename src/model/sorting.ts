import { Big } from "big.js";

import { ChartBar, ChartElement, ColorOrderMode, SortDirection, SortSpec, SortValue } from "./types";

export type ElementComparator = (a: ChartElement, b: ChartElement) => number;

/**
 * Builds the comparator chain used to order elements inside a bar.
 *
 * Two properties matter here and are easy to get wrong:
 *
 * - It performs no Mendix accessor calls. Every value it looks at was extracted
 *   once per element, so sorting stays O(n log n) comparisons rather than
 *   O(n log n) accessor allocations.
 * - It is a total order. `Array.prototype.sort` is stable, but stability alone
 *   is not enough because the input order can change between refreshes, so the
 *   data source index is always the final tiebreaker.
 *
 * Elements whose sort value is empty are placed last in both directions, which
 * keeps them out of the way instead of having them jump between ends when the
 * modeller flips the direction.
 */
export function createElementComparator(specs: SortSpec[], colorOrderMode: ColorOrderMode): ElementComparator {
    // Created once per sort configuration: constructing a collator per
    // comparison is one of the classic ways to make a sort crawl.
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

    const compareColor: ElementComparator =
        colorOrderMode === "value"
            ? (a, b) => (a.colorKey < b.colorKey ? -1 : a.colorKey > b.colorKey ? 1 : 0)
            : (a, b) => a.colorRank - b.colorRank;

    return (a, b) => {
        for (let i = 0; i < specs.length; i++) {
            const spec = specs[i];
            let result: number;

            if (spec.source === "color") {
                result = compareColor(a, b);
            } else {
                const left = a.sortValues[i];
                const right = b.sortValues[i];
                const leftMissing = left === undefined ? 1 : 0;
                const rightMissing = right === undefined ? 1 : 0;

                if (leftMissing !== rightMissing) {
                    return leftMissing - rightMissing;
                }
                result = leftMissing === 1 ? 0 : compareValues(spec.kind, left, right, collator);
            }

            if (result !== 0) {
                return spec.direction === "desc" ? -result : result;
            }
        }

        return a.sourceIndex - b.sourceIndex;
    };
}

function compareValues(kind: SortSpec["kind"], left: SortValue, right: SortValue, collator: Intl.Collator): number {
    switch (kind) {
        case "string":
            return collator.compare(left as string, right as string);
        case "number": {
            const diff = (left as number) - (right as number);
            return diff < 0 ? -1 : diff > 0 ? 1 : 0;
        }
        case "big":
            // Compared as decimals rather than converted to numbers, so that
            // high precision Decimal values do not collapse into ties.
            return (left as Big).cmp(right as Big);
    }
}

export type BarSortMode = "datasource" | "key" | "label" | "total" | "count";

/**
 * Orders the bars themselves.
 *
 * `datasource` means "the order the bars were discovered in", which is the
 * element data source order when grouping, and the bars data source order when
 * one is configured. That intent is carried on `ChartBar.index`, so this always
 * returns a comparator rather than leaving the array in map-insertion order.
 */
export function createBarComparator(mode: BarSortMode, direction: SortDirection): (a: ChartBar, b: ChartBar) => number {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const sign = direction === "desc" ? -1 : 1;

    return (a, b) => {
        let result: number;
        switch (mode) {
            case "key":
                result = collator.compare(a.key, b.key);
                break;
            case "label":
                result = collator.compare(a.label, b.label);
                break;
            case "total":
                result = a.total - b.total;
                break;
            case "count":
                result = a.elements.length - b.elements.length;
                break;
            case "datasource":
                result = a.index - b.index;
                break;
        }
        return result !== 0 ? sign * result : a.index - b.index;
    };
}
