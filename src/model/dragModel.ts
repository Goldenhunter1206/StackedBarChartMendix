import { ChartBar, ChartElement, ChartModel } from "./types";

export interface DropTarget {
    barKey: string;
    /** Insertion position in the target bar's bottom-up element order. */
    index: number;
}

export interface MoveDescription {
    element: ChartElement;
    sourceBarKey: string;
    sourceIndex: number;
    targetBarKey: string;
    targetIndex: number;
    /** Element that will sit below the moved one, in stack order. */
    previous?: ChartElement;
    /** Element that will sit above the moved one, in stack order. */
    next?: ChartElement;
}

/** Locates an element and its position within the model. */
export function findElement(
    model: ChartModel,
    elementKey: string
): { bar: ChartBar; element: ChartElement; index: number } | null {
    for (const bar of model.bars) {
        const index = bar.elements.findIndex(element => element.key === elementKey);
        if (index !== -1) {
            return { bar, element: bar.elements[index], index };
        }
    }
    return null;
}

/**
 * Adjusts a raw drop index for the fact that the dragged element is still part
 * of the layout it was measured against.
 *
 * Without this, dragging an element one slot down inside its own bar computes
 * an index that maps back to where it already was.
 */
export function normalizeDropIndex(
    rawIndex: number,
    sameBar: boolean,
    sourceIndex: number,
    targetLength: number
): number {
    const index = sameBar && rawIndex > sourceIndex ? rawIndex - 1 : rawIndex;
    return Math.min(Math.max(0, index), sameBar ? targetLength - 1 : targetLength);
}

/**
 * Describes a move without performing it, including the elements that will end
 * up on either side of the moved one — which is what lets a microflow insert
 * between two rows even if its own sort order differs from the chart's.
 */
export function describeMove(model: ChartModel, elementKey: string, target: DropTarget): MoveDescription | null {
    const found = findElement(model, elementKey);
    if (!found) {
        return null;
    }
    const targetBar = model.bars.find(bar => bar.key === target.barKey);
    if (!targetBar) {
        return null;
    }

    const sameBar = targetBar.key === found.bar.key;
    const remaining = sameBar ? targetBar.elements.filter(element => element.key !== elementKey) : targetBar.elements;
    const index = Math.min(Math.max(0, target.index), remaining.length);

    return {
        element: found.element,
        sourceBarKey: found.bar.key,
        sourceIndex: found.index,
        targetBarKey: targetBar.key,
        targetIndex: index,
        previous: remaining[index - 1],
        next: remaining[index]
    };
}

/** True when the move would leave the model exactly as it is. */
export function isNoOp(move: MoveDescription): boolean {
    return move.sourceBarKey === move.targetBarKey && move.sourceIndex === move.targetIndex;
}

/**
 * Produces the model as it would look after the move.
 *
 * Used for the optimistic update, and also for the live gap preview during a
 * drag — laying out a hypothetical model is cheap because layout is a pure
 * function, and it is what makes the target slot open up under the cursor.
 *
 * Bars that are not involved keep their identity, so their memoised components
 * do not re-render.
 */
export function applyMove(model: ChartModel, move: MoveDescription): ChartModel {
    const bars = model.bars.map(bar => {
        const isSource = bar.key === move.sourceBarKey;
        const isTarget = bar.key === move.targetBarKey;
        if (!isSource && !isTarget) {
            return bar;
        }

        let elements = bar.elements;
        if (isSource) {
            elements = elements.filter(element => element.key !== move.element.key);
        }
        if (isTarget) {
            const moved = isSource ? move.element : { ...move.element, barKey: bar.key };
            elements = [...elements.slice(0, move.targetIndex), moved, ...elements.slice(move.targetIndex)];
        }

        return {
            ...bar,
            elements,
            total: elements.reduce((sum, element) => sum + element.value, 0)
        };
    });

    return {
        ...model,
        bars,
        maxTotal: bars.reduce((max, bar) => Math.max(max, bar.total), 0)
    };
}

/**
 * Picks a sequence value that sorts strictly between the two neighbours.
 *
 * Fractional indexing means a drop only ever writes the element that moved,
 * instead of renumbering the whole bar — one attribute write rather than n.
 */
export function fractionalSequence(previous: number | undefined, next: number | undefined): number {
    if (previous !== undefined && next !== undefined) {
        return (previous + next) / 2;
    }
    if (next !== undefined) {
        return next - 1;
    }
    if (previous !== undefined) {
        return previous + 1;
    }
    return 0;
}

/**
 * True when repeated halving has eaten the available precision and the bar
 * needs renumbering rather than another fractional insert.
 */
export function needsRenumber(previous: number | undefined, next: number | undefined): boolean {
    if (previous === undefined || next === undefined) {
        return false;
    }
    const middle = (previous + next) / 2;
    return middle === previous || middle === next;
}
