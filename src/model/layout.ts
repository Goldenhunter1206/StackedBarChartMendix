import { ChartBar, ChartLayout, ChartModel, ChartElement, LayoutBar, LayoutNode } from "./types";
import { buildScale } from "./scale";

export interface LayoutOptions {
    plotHeight: number;
    barWidth: number;
    barGap: number;
    segmentGap: number;
    /** "percentage" normalises every bar to fill the plot. */
    stackMode: "absolute" | "percentage";
    /** Runs of nodes thinner than this are drawn as one cluster. 0 disables it. */
    sliverThreshold: number;
    sliverClustering: boolean;
}

/**
 * Turns the data model into pixel rectangles.
 *
 * Layout is deliberately separate from the model: the model only changes when
 * Mendix delivers new data, while layout also has to be redone on resize. It is
 * a pure function of (model, options), which is what makes both the animation
 * layer and the drag preview cheap — they just lay out a hypothetical model and
 * compare.
 */
export function layoutChart(model: ChartModel, options: LayoutOptions): ChartLayout {
    const { plotHeight, barWidth, barGap, stackMode } = options;
    const percentage = stackMode === "percentage";
    const scale = percentage ? { axisMax: 100, ticks: [0, 25, 50, 75, 100] } : buildScale(model.maxTotal);

    const bars: LayoutBar[] = new Array(model.bars.length);
    let nodeCount = 0;
    let x = barGap / 2;

    for (let i = 0; i < model.bars.length; i++) {
        const bar = model.bars[i];
        // In percentage mode every bar fills the plot, so each bar is scaled by
        // its own total rather than by the chart-wide maximum.
        const denominator = percentage ? bar.total : scale.axisMax;
        const pixelsPerUnit = denominator > 0 ? plotHeight / denominator : 0;

        const nodes = layoutBar(bar, pixelsPerUnit, options);
        nodeCount += nodes.length;

        bars[i] = {
            bar,
            x,
            width: barWidth,
            stackHeight: percentage ? (bar.total > 0 ? plotHeight : 0) : bar.total * pixelsPerUnit,
            nodes
        };
        x += barWidth + barGap;
    }

    return {
        bars,
        contentWidth: Math.max(0, x - barGap + barGap / 2),
        plotHeight,
        axisMax: scale.axisMax,
        ticks: scale.ticks,
        nodeCount
    };
}

function layoutBar(bar: ChartBar, pixelsPerUnit: number, options: LayoutOptions): LayoutNode[] {
    const { segmentGap, sliverClustering, sliverThreshold } = options;
    const elements = bar.elements;
    const nodes: LayoutNode[] = [];

    let cursor = 0;
    let index = 0;

    while (index < elements.length) {
        const element = elements[index];
        const rawHeight = element.value * pixelsPerUnit;

        if (sliverClustering && sliverThreshold > 0 && rawHeight < sliverThreshold) {
            // Absorb the whole run of unrenderably thin elements into one node.
            // They keep their identity in the model: this only affects drawing.
            const members: ChartElement[] = [];
            let clusterHeight = 0;
            while (index < elements.length) {
                const candidate = elements[index];
                const candidateHeight = candidate.value * pixelsPerUnit;
                if (candidateHeight >= sliverThreshold) {
                    break;
                }
                members.push(candidate);
                clusterHeight += candidateHeight;
                index++;
            }
            if (members.length === 1) {
                nodes.push(makeNode(members[0], cursor, clusterHeight, 1));
            } else {
                const node = makeNode(members[0], cursor, clusterHeight, members.length);
                node.key = `cluster:${members[0].key}:${members.length}`;
                node.members = members;
                nodes.push(node);
            }
            cursor += clusterHeight + segmentGap;
            continue;
        }

        nodes.push(makeNode(element, cursor, rawHeight, 1));
        cursor += rawHeight + segmentGap;
        index++;
    }

    // Gaps are drawn inside the stack, so without compensation a bar with n
    // nodes would stand (n-1) gaps taller than its value warrants and bars with
    // different element counts would stop being comparable against the axis.
    // Shrink the nodes to give the gaps back their space.
    const totalGap = Math.max(0, nodes.length - 1) * segmentGap;
    if (totalGap > 0) {
        // `cursor` carries a trailing gap for every node, so subtract them all
        // to recover the summed element heights.
        const contentHeight = cursor - nodes.length * segmentGap;
        const shrink = contentHeight > totalGap ? (contentHeight - totalGap) / contentHeight : 0;
        let adjusted = 0;
        for (const node of nodes) {
            node.height = node.height * shrink;
            node.y = adjusted;
            adjusted += node.height + segmentGap;
        }
    }

    return nodes;
}

function makeNode(element: ChartElement, y: number, height: number, count: number): LayoutNode {
    return {
        key: element.key,
        y,
        height: Math.max(0, height),
        color: element.color,
        element,
        count
    };
}

/**
 * Finds the bar whose column contains `x`. Bars are evenly pitched, so this is
 * arithmetic rather than a search, and it stays correct under virtualization
 * because it works off the layout model rather than the mounted DOM.
 */
export function barIndexAt(layout: ChartLayout, x: number, options: LayoutOptions): number {
    if (layout.bars.length === 0) {
        return -1;
    }
    // Bar i occupies the column [i * pitch, (i + 1) * pitch), with the bar
    // itself inset by half a gap, so the containing column is plain division.
    const pitch = options.barWidth + options.barGap;
    const index = Math.floor(x / pitch);
    return Math.min(layout.bars.length - 1, Math.max(0, index));
}

/**
 * Computes where a dragged element would be inserted if it were dropped at
 * `yFromBottom` in `bar`, using the midpoint of each node as the boundary.
 */
export function dropIndexAt(bar: LayoutBar, yFromBottom: number): number {
    const nodes = bar.nodes;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (yFromBottom < node.y + node.height / 2) {
            return i;
        }
    }
    return nodes.length;
}
