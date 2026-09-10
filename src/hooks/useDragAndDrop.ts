import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { barIndexAt, dropIndexAt, LayoutOptions } from "../model/layout";
import {
    applyMove,
    describeMove,
    DropTarget,
    findElement,
    isNoOp,
    MoveDescription,
    normalizeDropIndex
} from "../model/dragModel";
import { ChartElement, ChartLayout, ChartModel } from "../model/types";
import { HEADROOM } from "../ui/constants";

/** Pixels the pointer must travel before a press becomes a drag. */
const DRAG_THRESHOLD = 4;
/** Distance from the container edge at which auto-scroll kicks in. */
const EDGE_SIZE = 56;
const EDGE_SPEED = 18;

export interface DragState {
    elementKey: string;
    element: ChartElement;
    pointerX: number;
    pointerY: number;
    width: number;
    height: number;
    color: string;
    target: DropTarget | null;
}

export interface DragOptions {
    /** The plot container. Null until it mounts, which is after the first render. */
    scrollElement: HTMLElement | null;
    model: ChartModel;
    layout: ChartLayout;
    layoutOptions: LayoutOptions;
    enabled: boolean;
    allowReorderWithinBar: boolean;
    allowMoveAcrossBars: boolean;
    canDrag: (element: ChartElement) => boolean;
    canDrop: (barKey: string) => boolean;
    /** Called once the user releases over a valid target. */
    onDrop: (move: MoveDescription) => void;
}

export interface DragResult {
    drag: DragState | null;
    /** The model as it would be after the drop, so the gap opens live. */
    previewModel: ChartModel | null;
    pendingMove: MoveDescription | null;
    cancel: () => void;
}

/**
 * Pointer-driven drag and drop.
 *
 * Pointer events rather than HTML5 drag and drop, for reasons specific to this
 * widget: the source element can be unmounted mid-drag by virtualization (which
 * aborts a native drag outright), the drop index needs sub-pixel resolution
 * between elements a few pixels tall, and HTML5 drag has no touch support.
 * Pointer capture on the container survives all of that.
 */
export function useDragAndDrop(options: DragOptions): DragResult {
    const [drag, setDrag] = useState<DragState | null>(null);
    // Written in an effect, not during render: the listeners below only read it
    // while handling an event, which is always after the effect has run.
    const latest = useRef(options);
    useEffect(() => {
        latest.current = options;
    });

    const cancel = useCallback(() => setDrag(null), []);

    useEffect(() => {
        const container = options.scrollElement;
        if (!container) {
            return;
        }

        let pointerId: number | null = null;
        let startX = 0;
        let startY = 0;
        let dragging = false;
        let activeKey: string | null = null;
        let scrollFrame = 0;
        let edgeVelocity = 0;

        const stopAutoScroll = (): void => {
            if (scrollFrame !== 0) {
                cancelAnimationFrame(scrollFrame);
                scrollFrame = 0;
            }
            edgeVelocity = 0;
        };

        const runAutoScroll = (): void => {
            if (edgeVelocity === 0) {
                stopAutoScroll();
                return;
            }
            container.scrollLeft += edgeVelocity;
            scrollFrame = requestAnimationFrame(runAutoScroll);
        };

        const reset = (): void => {
            stopAutoScroll();
            if (pointerId !== null && container.hasPointerCapture?.(pointerId)) {
                container.releasePointerCapture(pointerId);
            }
            pointerId = null;
            dragging = false;
            activeKey = null;
            setDrag(null);
        };

        const onPointerDown = (event: PointerEvent): void => {
            const opts = latest.current;
            if (!opts.enabled || event.button !== 0) {
                return;
            }
            const node = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-el]");
            const key = node?.dataset.el;
            if (!node || !key) {
                return;
            }
            const found = findElement(opts.model, key);
            if (!found || !opts.canDrag(found.element)) {
                return;
            }

            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            activeKey = key;
            dragging = false;
        };

        const onPointerMove = (event: PointerEvent): void => {
            if (pointerId !== event.pointerId || activeKey === null) {
                return;
            }
            const opts = latest.current;

            if (!dragging) {
                if (Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_THRESHOLD) {
                    return;
                }
                const node = container.querySelector<HTMLElement>(`[data-el="${cssEscape(activeKey)}"]`);
                const found = findElement(opts.model, activeKey);
                if (!node || !found) {
                    reset();
                    return;
                }
                dragging = true;
                container.setPointerCapture?.(event.pointerId);
                const box = node.getBoundingClientRect();
                setDrag({
                    elementKey: activeKey,
                    element: found.element,
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    width: box.width,
                    height: box.height,
                    color: found.element.color,
                    target: null
                });
            }

            event.preventDefault();

            // Auto-scroll while the pointer sits near either edge, so a drag
            // can reach bars that are off screen.
            const box = container.getBoundingClientRect();
            const fromLeft = event.clientX - box.left;
            const fromRight = box.right - event.clientX;
            edgeVelocity =
                fromLeft < EDGE_SIZE
                    ? -EDGE_SPEED * (1 - Math.max(0, fromLeft) / EDGE_SIZE)
                    : fromRight < EDGE_SIZE
                    ? EDGE_SPEED * (1 - Math.max(0, fromRight) / EDGE_SIZE)
                    : 0;
            if (edgeVelocity !== 0 && scrollFrame === 0) {
                scrollFrame = requestAnimationFrame(runAutoScroll);
            }

            const target = resolveTarget(container, event.clientX, event.clientY, activeKey, latest.current);
            setDrag(previous =>
                previous ? { ...previous, pointerX: event.clientX, pointerY: event.clientY, target } : previous
            );
        };

        const onPointerUp = (event: PointerEvent): void => {
            if (pointerId !== event.pointerId) {
                return;
            }
            const wasDragging = dragging;
            const key = activeKey;
            const target =
                wasDragging && key ? resolveTarget(container, event.clientX, event.clientY, key, latest.current) : null;

            reset();

            if (!wasDragging || !key) {
                return;
            }
            // A completed drag must not also register as a click, or releasing
            // over an element would open its menu.
            suppressNextClick(container);

            if (!target) {
                return;
            }
            const move = describeMove(latest.current.model, key, target);
            if (move && !isNoOp(move)) {
                latest.current.onDrop(move);
            }
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && dragging) {
                reset();
            }
        };

        container.addEventListener("pointerdown", onPointerDown);
        container.addEventListener("pointermove", onPointerMove);
        container.addEventListener("pointerup", onPointerUp);
        container.addEventListener("pointercancel", reset);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("blur", reset);

        return () => {
            reset();
            container.removeEventListener("pointerdown", onPointerDown);
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerup", onPointerUp);
            container.removeEventListener("pointercancel", reset);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("blur", reset);
        };
    }, [options.scrollElement]);

    const { model } = options;

    const preview = useMemo(() => {
        const move = drag?.target ? describeMove(model, drag.elementKey, drag.target) : null;
        if (!move || isNoOp(move)) {
            return { pendingMove: move, previewModel: null };
        }
        const moved = applyMove(model, move);
        return {
            pendingMove: move,
            // The axis may grow during a drag but never shrink: a rescale under
            // the cursor makes every other bar jump while the user is aiming.
            previewModel: { ...moved, maxTotal: Math.max(model.maxTotal, moved.maxTotal) }
        };
    }, [drag, model]);

    return { drag, previewModel: preview.previewModel, pendingMove: preview.pendingMove, cancel };
}

/** Maps a pointer position to the bar and insertion index under it. */
function resolveTarget(
    container: HTMLElement,
    clientX: number,
    clientY: number,
    elementKey: string,
    options: DragOptions
): DropTarget | null {
    const { layout, layoutOptions, model } = options;
    const box = container.getBoundingClientRect();
    const contentX = clientX - box.left + container.scrollLeft;

    const barIndex = barIndexAt(layout, contentX, layoutOptions);
    const layoutBar = layout.bars[barIndex];
    if (!layoutBar) {
        return null;
    }

    const source = findElement(model, elementKey);
    if (!source) {
        return null;
    }

    const sameBar = layoutBar.bar.key === source.bar.key;
    if (sameBar && !options.allowReorderWithinBar) {
        return null;
    }
    if (!sameBar && (!options.allowMoveAcrossBars || !options.canDrop(layoutBar.bar.key))) {
        return null;
    }

    const stackBottom = box.top + HEADROOM + layout.plotHeight;
    const rawIndex = dropIndexAt(layoutBar, stackBottom - clientY);
    const index = normalizeDropIndex(rawIndex, sameBar, source.index, layoutBar.bar.elements.length);

    return { barKey: layoutBar.bar.key, index };
}

/**
 * Swallows the click that a completed drag produces, so releasing over an
 * element does not also open its menu.
 *
 * Scoped to the chart container and torn down on the next task: a
 * document-wide suppressor would eat the user's next click anywhere — including
 * the confirmation dialog that a drop has just opened.
 */
function suppressNextClick(container: HTMLElement): void {
    const handler = (event: MouseEvent): void => {
        event.stopPropagation();
        event.preventDefault();
        container.removeEventListener("click", handler, true);
    };
    container.addEventListener("click", handler, true);
    // The click follows pointerup within the same task, so the next macrotask
    // is late enough to catch it and early enough not to affect anything else.
    window.setTimeout(() => container.removeEventListener("click", handler, true), 0);
}

function cssEscape(value: string): string {
    return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}
