import { ObjectItem } from "mendix";
import { Big } from "big.js";

/** A value pre-extracted from Mendix, reduced to something cheap to compare. */
export type SortValue = string | number | Big | undefined;

export type SortDirection = "asc" | "desc";

/**
 * How one configured sort key should be compared. `kind` is decided once, from
 * the Mendix attribute type, so the comparator never has to inspect values.
 */
export interface SortSpec {
    source: "color" | "attribute";
    direction: SortDirection;
    kind: "string" | "number" | "big";
}

/** How colours rank against each other when sorting by colour. */
export type ColorOrderMode = "appearance" | "value" | "custom";

/** One Mendix object, projected exactly once per data version. */
export interface ChartElement {
    /** Stable identity for React keys, animation and drag tracking. */
    key: string;
    item: ObjectItem;
    barKey: string;
    /** Magnitude in value units. Never negative. */
    value: number;
    /** The colour as written by the modeller, used verbatim for rendering. */
    color: string;
    /** Canonical colour, used for equality and for `value` ordering. */
    colorKey: string;
    /** Rank of this colour under the configured colour order. */
    colorRank: number;
    /** One entry per configured sort key, aligned with the SortSpec array. */
    sortValues: SortValue[];
    /** Index in the data source, used as the final stable tiebreaker. */
    sourceIndex: number;
}

export interface ChartBar {
    key: string;
    label: string;
    /** Present only when a bars data source is configured. */
    item?: ObjectItem;
    elements: ChartElement[];
    total: number;
    /** Index in the rendered bar order. */
    index: number;
}

/** One row of the legend: a distinct colour and what it stands for. */
export interface LegendEntry {
    colorKey: string;
    color: string;
    label: string;
    count: number;
}

export interface ChartModel {
    bars: ChartBar[];
    legend: LegendEntry[];
    /** Largest bar total, i.e. the top of the value axis before it is rounded. */
    maxTotal: number;
    elementCount: number;
    /** True when the data source returned fewer rows than exist on the server. */
    truncated: boolean;
    totalCount?: number;
}

/**
 * A drawable node. Usually one element; when sliver clustering is enabled a
 * node can stand in for a run of elements that are individually too small to
 * render. Clustering is purely visual — the underlying elements are never
 * merged in the model.
 */
export interface LayoutNode {
    key: string;
    /** Distance in px from the bottom of the plot to the bottom of the node. */
    y: number;
    height: number;
    color: string;
    element: ChartElement;
    /** > 1 only for a sliver cluster. */
    count: number;
    members?: ChartElement[];
}

export interface LayoutBar {
    bar: ChartBar;
    /** Distance in px from the left edge of the scrollable content. */
    x: number;
    width: number;
    /** Height in px of the whole stack. */
    stackHeight: number;
    nodes: LayoutNode[];
}

export interface ChartLayout {
    bars: LayoutBar[];
    /** Full scrollable width in px. */
    contentWidth: number;
    /** Height of the plot area in px. */
    plotHeight: number;
    /** Top of the value axis in value units. */
    axisMax: number;
    ticks: number[];
    /** Number of nodes across all bars, used to decide whether to animate. */
    nodeCount: number;
}
