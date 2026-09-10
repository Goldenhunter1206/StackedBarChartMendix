import { ListAttributeValue, ListExpressionValue, ListValue, ObjectItem, ValueStatus } from "mendix";
import { Big } from "big.js";

import { StackedBarChartContainerProps } from "../../typings/StackedBarChartProps";
import { buildColorRanker, FALLBACK_COLOR, normalizeColor, resolvePalette } from "./color";
import { createBarComparator, createElementComparator } from "./sorting";
import { ChartBar, ChartElement, ChartModel, LegendEntry, SortSpec, SortValue } from "./types";

/**
 * The subset of widget properties the model builder reads. Narrowing it keeps
 * the dependency explicit and lets tests build only what they need.
 */
export type BuildModelProps = Pick<
    StackedBarChartContainerProps,
    | "datasource"
    | "barKeyAttribute"
    | "valueAttribute"
    | "identityAttribute"
    | "labelTemplate"
    | "barsDatasource"
    | "barsKeyAttribute"
    | "barsLabelTemplate"
    | "showEmptyBars"
    | "colorMode"
    | "colorExpression"
    | "colorAttribute"
    | "seriesAttribute"
    | "palette"
    | "customPalette"
    | "sortKeys"
    | "colorOrderMode"
    | "colorOrderList"
    | "barSortMode"
    | "barSortDirection"
>;

const EMPTY_BAR_LABEL = "(empty)";

/**
 * Projects the Mendix data sources into a ChartModel.
 *
 * This is the only place that calls Mendix list accessors in bulk. Every
 * accessor is invoked exactly once per element, because `.get(item)` allocates
 * a wrapper on each call — calling it from a render loop or a comparator is the
 * usual reason a data-heavy Mendix widget becomes slow.
 */
export function buildModel(props: BuildModelProps): ChartModel {
    const items = props.datasource.items ?? [];
    const specs = buildSortSpecs(props);
    const ranker = buildColorRanker(props.colorOrderMode, props.colorOrderList);
    const paletteColors = resolvePalette(props.palette, props.customPalette);
    const seriesColors = new Map<string, string>();

    const barsByKey = new Map<string, ChartBar>();
    // One representative element per distinct colour, so the legend can be
    // labelled without reading a label for every element in the data.
    const colorGroups = new Map<string, { color: string; sample: ChartElement; count: number }>();

    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const barKey = stringifyKey(readAttribute(props.barKeyAttribute, item));
        const color = resolveColor(props, item, paletteColors, seriesColors);

        const element: ChartElement = {
            key: resolveIdentity(props.identityAttribute, item),
            item,
            barKey,
            value: toPositiveNumber(readAttribute(props.valueAttribute, item)),
            color,
            colorKey: normalizeColor(color),
            colorRank: ranker.rank(color),
            sortValues: extractSortValues(props, specs, item),
            sourceIndex: index
        };

        let bar = barsByKey.get(barKey);
        if (!bar) {
            bar = { key: barKey, label: "", elements: [], total: 0, index: barsByKey.size };
            barsByKey.set(barKey, bar);
        }
        bar.elements.push(element);
        bar.total += element.value;

        const group = colorGroups.get(element.colorKey);
        if (group) {
            group.count++;
        } else {
            colorGroups.set(element.colorKey, { color: element.color, sample: element, count: 1 });
        }
    }

    applyBarIdentity(props, barsByKey);

    const bars = Array.from(barsByKey.values());
    bars.sort(createBarComparator(props.barSortMode, props.barSortDirection));

    const elementComparator = createElementComparator(specs, props.colorOrderMode);
    let maxTotal = 0;
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        bar.index = i;
        bar.elements.sort(elementComparator);
        if (bar.total > maxTotal) {
            maxTotal = bar.total;
        }
    }

    const totalCount = props.datasource.totalCount;
    return {
        bars,
        legend: buildLegend(props, colorGroups),
        maxTotal,
        elementCount: items.length,
        truncated: props.datasource.hasMoreItems === true,
        totalCount
    };
}

/**
 * Adds bars coming from the optional bars data source: their captions, their
 * order, and — when requested — bars that currently hold no elements at all,
 * which the flat grouping can never produce on its own.
 */
function applyBarIdentity(props: BuildModelProps, barsByKey: Map<string, ChartBar>): void {
    const barItems = props.barsDatasource?.items;

    if (barItems && props.barsKeyAttribute) {
        for (const barItem of barItems) {
            const key = stringifyKey(readAttribute(props.barsKeyAttribute, barItem));
            let bar = barsByKey.get(key);
            if (!bar) {
                if (!props.showEmptyBars) {
                    continue;
                }
                bar = { key, label: "", elements: [], total: 0, index: barsByKey.size };
                barsByKey.set(key, bar);
            }
            bar.item = barItem;
            bar.label = readExpression(props.barsLabelTemplate, barItem) ?? labelFromKey(key);
        }
        // Bars from the data source come first, in their own order; any bar that
        // only exists in the element data keeps its discovery order after them.
        let order = 0;
        for (const barItem of barItems) {
            const key = stringifyKey(readAttribute(props.barsKeyAttribute, barItem));
            const bar = barsByKey.get(key);
            if (bar) {
                bar.index = order++;
            }
        }
        for (const bar of barsByKey.values()) {
            if (!bar.item) {
                bar.index = order++;
            }
        }
    }

    // Any bar still without a caption falls back to the first element's label,
    // then to the raw key.
    for (const bar of barsByKey.values()) {
        if (bar.label === "") {
            bar.label = labelFromKey(bar.key);
        }
    }
}

/**
 * Names each distinct colour. Labels are read only for the handful of sample
 * elements, never for the whole data set.
 */
function buildLegend(
    props: BuildModelProps,
    groups: Map<string, { color: string; sample: ChartElement; count: number }>
): LegendEntry[] {
    const entries: LegendEntry[] = [];
    for (const [colorKey, group] of groups) {
        // The series attribute names what a colour means, which is what a
        // legend is for. An element label only names one element that happens
        // to have that colour, so it is the weaker fallback.
        let label: string | undefined;
        if (props.seriesAttribute) {
            label = stringifyKey(readAttribute(props.seriesAttribute, group.sample.item));
        }
        if (!label) {
            label = readExpression(props.labelTemplate, group.sample.item);
        }
        entries.push({ colorKey, color: group.color, label: label || group.color, count: group.count });
    }
    return entries;
}

function labelFromKey(key: string): string {
    return key === "" ? EMPTY_BAR_LABEL : key;
}

function resolveIdentity(attribute: BuildModelProps["identityAttribute"], item: ObjectItem): string {
    if (attribute) {
        const value = readAttribute(attribute, item);
        if (value !== undefined) {
            return `id:${stringifyKey(value)}`;
        }
    }
    return item.id;
}

function resolveColor(
    props: BuildModelProps,
    item: ObjectItem,
    palette: string[],
    seriesColors: Map<string, string>
): string {
    switch (props.colorMode) {
        case "expression": {
            const value = readExpression(props.colorExpression, item);
            return value && value.trim() !== "" ? value.trim() : FALLBACK_COLOR;
        }
        case "attribute": {
            const value = props.colorAttribute ? readAttribute(props.colorAttribute, item) : undefined;
            return typeof value === "string" && value.trim() !== "" ? value.trim() : FALLBACK_COLOR;
        }
        case "palette": {
            const seriesKey = props.seriesAttribute ? stringifyKey(readAttribute(props.seriesAttribute, item)) : "";
            let color = seriesColors.get(seriesKey);
            if (!color) {
                // Assigned in order of first appearance, so a series keeps its
                // colour for as long as the data keeps its shape.
                color = palette[seriesColors.size % palette.length];
                seriesColors.set(seriesKey, color);
            }
            return color;
        }
    }
}

/** Builds one SortSpec per configured sort key, aligned by index. */
export function buildSortSpecs(props: Pick<BuildModelProps, "sortKeys">): SortSpec[] {
    const configured = props.sortKeys ?? [];
    if (configured.length === 0) {
        // Ordering by colour is the documented default, so an unconfigured
        // widget still groups colours together instead of looking random.
        return [{ source: "color", direction: "asc", kind: "string" }];
    }
    return configured.map(key => ({
        source: key.sortSource === "attribute" && key.sortAttribute ? "attribute" : "color",
        direction: key.sortDirection,
        kind: key.sortAttribute ? sortKindFor(key.sortAttribute.type) : "string"
    }));
}

function extractSortValues(props: BuildModelProps, specs: SortSpec[], item: ObjectItem): SortValue[] {
    const values: SortValue[] = new Array(specs.length);
    for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const configured = props.sortKeys[i];
        if (spec.source !== "attribute" || !configured?.sortAttribute) {
            values[i] = undefined;
            continue;
        }
        values[i] = normalizeSortValue(configured.sortAttribute, item);
    }
    return values;
}

/** Maps a Mendix attribute type onto the comparison strategy for that type. */
export function sortKindFor(type: ListAttributeValue["type"]): SortSpec["kind"] {
    switch (type) {
        case "Decimal":
        case "Integer":
        case "Long":
        case "AutoNumber":
            return "big";
        case "DateTime":
        case "Boolean":
        case "Enum":
            return "number";
        default:
            return "string";
    }
}

/**
 * Reduces an attribute to something the comparator can handle without any
 * further type inspection.
 *
 * Enumerations are ranked by their position in the declared universe rather
 * than by caption, so "Low, Medium, High" sorts in that order instead of
 * alphabetically.
 */
function normalizeSortValue(
    attribute: ReadableAttribute & { type: ListAttributeValue["type"]; universe?: unknown },
    item: ObjectItem
): SortValue {
    const value = readAttribute(attribute, item);
    if (value === undefined) {
        return undefined;
    }
    switch (attribute.type) {
        case "DateTime":
            return (value as Date).getTime();
        case "Boolean":
            return value === true ? 1 : 0;
        case "Enum": {
            // Ranked by position in the declared enumeration, so "Low, Medium,
            // High" orders the way the modeller wrote it rather than
            // alphabetically.
            const universe = attribute.universe as unknown[] | undefined;
            const index = universe ? universe.indexOf(value) : -1;
            return index >= 0 ? index : String(value);
        }
        case "Decimal":
        case "Integer":
        case "Long":
        case "AutoNumber":
            return value as Big;
        default:
            return String(value);
    }
}

/**
 * Structural view of any list attribute. The generated props type each
 * attribute with its own narrow value union, which makes a single concrete
 * signature impossible; reading them structurally keeps one helper for all.
 */
interface ReadableAttribute {
    get: (item: ObjectItem) => { readonly status: ValueStatus; readonly value: unknown };
}

type AttributeReadValue = string | boolean | Big | Date | undefined;

function readAttribute(attribute: ReadableAttribute | undefined, item: ObjectItem): AttributeReadValue {
    if (!attribute) {
        return undefined;
    }
    const value = attribute.get(item);
    return value.status === ValueStatus.Available ? (value.value as AttributeReadValue) : undefined;
}

function readExpression(expression: ListExpressionValue<string> | undefined, item: ObjectItem): string | undefined {
    if (!expression) {
        return undefined;
    }
    const value = expression.get(item);
    return value.status === ValueStatus.Available ? value.value : undefined;
}

/** Normalizes any supported bar key type into a stable string. */
export function stringifyKey(value: string | boolean | Big | Date | undefined): string {
    if (value === undefined) {
        return "";
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }
    if (typeof value === "string") {
        return value;
    }
    return value.toString();
}

function toPositiveNumber(value: string | boolean | Big | Date | undefined): number {
    if (value === undefined || typeof value === "string" || typeof value === "boolean" || value instanceof Date) {
        return 0;
    }
    const numeric = value.toNumber();
    // Negative contributions have no meaning in a stack, and letting them
    // through would make offsets run backwards.
    return isFinite(numeric) && numeric > 0 ? numeric : 0;
}

/** Reads the datasource status without forcing callers to import ValueStatus. */
export function isLoading(datasource: ListValue): boolean {
    return datasource.status === ValueStatus.Loading;
}
