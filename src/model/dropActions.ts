import Big from "big.js";
import { ListAttributeValue, ObjectItem, ValueStatus } from "mendix";

import { ChartElement, ChartModel } from "./types";
import { fractionalSequence, MoveDescription, needsRenumber } from "./dragModel";

export interface DropArguments {
    sourceBarKey: string;
    targetBarKey: string;
    sourceIndex: Big;
    targetIndex: Big;
    previousElementGuid: string | undefined;
    nextElementGuid: string | undefined;
}

/**
 * The drop context handed to the microflow.
 *
 * Both an index and the neighbouring element ids are supplied on purpose: the
 * index is what a sequence-based domain model wants, while the neighbours let a
 * microflow insert between two specific rows even when its own sort order does
 * not match what the chart displayed.
 */
export function dropArguments(move: MoveDescription): DropArguments {
    return {
        sourceBarKey: move.sourceBarKey,
        targetBarKey: move.targetBarKey,
        sourceIndex: new Big(move.sourceIndex),
        targetIndex: new Big(move.targetIndex),
        previousElementGuid: move.previous?.item.id,
        nextElementGuid: move.next?.item.id
    };
}

/**
 * Writes the new position into the sequence attribute, if one is configured.
 *
 * Normally this is a single write: a fractional index between the two
 * neighbours reorders the element without renumbering the rest of the bar.
 * Only when repeated halving has exhausted float precision does it fall back to
 * renumbering the target bar.
 */
export function writeSequence(
    attribute: ListAttributeValue<Big> | undefined,
    model: ChartModel,
    move: MoveDescription
): void {
    if (!attribute) {
        return;
    }

    const previous = readSequence(attribute, move.previous);
    const next = readSequence(attribute, move.next);

    if (needsRenumber(previous, next)) {
        renumberBar(attribute, model, move);
        return;
    }

    setSequence(attribute, move.element.item, fractionalSequence(previous, next));
}

/** Rewrites the whole target bar with whole numbers, restoring headroom. */
function renumberBar(attribute: ListAttributeValue<Big>, model: ChartModel, move: MoveDescription): void {
    const targetBar = model.bars.find(bar => bar.key === move.targetBarKey);
    if (!targetBar) {
        return;
    }
    const ordered = targetBar.elements.filter(element => element.key !== move.element.key);
    ordered.splice(move.targetIndex, 0, move.element);
    ordered.forEach((element, index) => setSequence(attribute, element.item, index * 1000));
}

function setSequence(attribute: ListAttributeValue<Big>, item: ObjectItem, value: number): void {
    const editable = attribute.get(item);
    // A read-only attribute drops writes silently, so there is nothing to be
    // gained by attempting one.
    if (!editable.readOnly) {
        editable.setValue(new Big(value));
    }
}

function readSequence(attribute: ListAttributeValue<Big>, element: ChartElement | undefined): number | undefined {
    if (!element) {
        return undefined;
    }
    const value = attribute.get(element.item);
    if (value.status !== ValueStatus.Available || value.value === undefined) {
        return undefined;
    }
    return value.value.toNumber();
}
