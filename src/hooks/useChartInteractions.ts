import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChartBar, ChartElement, ChartLayout, LayoutBar, LayoutNode } from "../model/types";
import { Rect } from "../utils/positioning";

export interface ElementTarget {
    element: ChartElement;
    node: LayoutNode;
    bar: ChartBar;
    layoutBar: LayoutBar;
    rect: Rect;
}

export interface BarTarget {
    bar: ChartBar;
    layoutBar: LayoutBar;
    rect: Rect;
}

export interface InteractionOptions {
    scrollRef: RefObject<HTMLElement>;
    layout: ChartLayout;
    hoverEnabled: boolean;
    clickEnabled: boolean;
    showDelay: number;
    hideDelay: number;
    /** Suppresses hover while a drag is in flight. */
    suspended: boolean;
    onElementClick: (target: ElementTarget) => void;
    onAddClick: (target: BarTarget) => void;
    /** Arrow-key navigation between elements, relative to the focused one. */
    onNavigate: (fromKey: string, barDelta: number, elementDelta: number) => void;
}

export interface Interactions {
    hover: ElementTarget | null;
    clearHover: () => void;
}

/**
 * Delegated pointer handling for the whole plot.
 *
 * One set of listeners on the scroll container rather than handlers on every
 * element: with thousands of elements mounted, per-element handlers cost real
 * memory, and — more importantly — a fresh closure per element per render would
 * defeat the memoisation that keeps re-renders cheap.
 */
export function useChartInteractions(options: InteractionOptions): Interactions {
    const { scrollRef, layout } = options;
    const [hover, setHover] = useState<ElementTarget | null>(null);

    // Handlers are attached once and read the latest values through a ref, so
    // changing data never re-attaches listeners.
    const latest = useRef(options);
    latest.current = options;

    const barsByKey = useMemo(() => {
        const map = new Map<string, LayoutBar>();
        for (const bar of layout.bars) {
            map.set(bar.bar.key, bar);
        }
        return map;
    }, [layout]);
    const barsRef = useRef(barsByKey);
    barsRef.current = barsByKey;

    const clearHover = useCallback(() => setHover(null), []);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) {
            return;
        }

        let showTimer = 0;
        let hideTimer = 0;
        let hoveredKey: string | null = null;

        const cancelTimers = (): void => {
            window.clearTimeout(showTimer);
            window.clearTimeout(hideTimer);
            showTimer = 0;
            hideTimer = 0;
        };

        const resolveElement = (event: Event): ElementTarget | null => {
            const target = event.target as HTMLElement | null;
            const node = target?.closest<HTMLElement>("[data-el]");
            if (!node) {
                return null;
            }
            return targetFor(node, barsRef.current);
        };

        const onPointerMove = (event: PointerEvent): void => {
            if (!latest.current.hoverEnabled || latest.current.suspended) {
                return;
            }
            const found = resolveElement(event);
            const key = found?.node.key ?? null;
            if (key === hoveredKey) {
                return;
            }
            hoveredKey = key;
            cancelTimers();

            if (!found) {
                hideTimer = window.setTimeout(() => setHover(null), latest.current.hideDelay);
                return;
            }
            // Re-read the rect at show time; the pointer may have moved on.
            showTimer = window.setTimeout(() => setHover(found), latest.current.showDelay);
        };

        const onPointerLeave = (): void => {
            hoveredKey = null;
            cancelTimers();
            hideTimer = window.setTimeout(() => setHover(null), latest.current.hideDelay);
        };

        const onClick = (event: MouseEvent): void => {
            const addButton = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-add]");
            if (addButton) {
                const layoutBar = barsRef.current.get(addButton.dataset.add ?? "");
                if (layoutBar) {
                    latest.current.onAddClick({
                        bar: layoutBar.bar,
                        layoutBar,
                        rect: toRect(addButton.getBoundingClientRect())
                    });
                }
                return;
            }

            if (!latest.current.clickEnabled) {
                return;
            }
            const found = resolveElement(event);
            if (found) {
                latest.current.onElementClick(found);
            }
        };

        const onKeyDown = (event: KeyboardEvent): void => {
            const active = document.activeElement as HTMLElement | null;
            const key = active?.dataset.el;
            if (!key) {
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                if (!latest.current.clickEnabled) {
                    return;
                }
                const found = targetFor(active!, barsRef.current);
                if (found) {
                    event.preventDefault();
                    latest.current.onElementClick(found);
                }
                return;
            }

            const move = ARROWS[event.key];
            if (move) {
                event.preventDefault();
                latest.current.onNavigate(key, move[0], move[1]);
            }
        };

        container.addEventListener("pointermove", onPointerMove);
        container.addEventListener("pointerleave", onPointerLeave);
        container.addEventListener("click", onClick);
        container.addEventListener("keydown", onKeyDown);

        return () => {
            cancelTimers();
            container.removeEventListener("pointermove", onPointerMove);
            container.removeEventListener("pointerleave", onPointerLeave);
            container.removeEventListener("click", onClick);
            container.removeEventListener("keydown", onKeyDown);
        };
    }, [scrollRef]);

    // A hovered element that scrolled away or was removed must not keep a stale
    // tooltip anchored to nothing.
    useEffect(() => {
        if (hover && !barsByKey.has(hover.bar.key)) {
            setHover(null);
        }
    }, [barsByKey, hover]);

    return { hover, clearHover };
}

/** Left/right move between bars; up/down move within the stack. */
const ARROWS: Record<string, [barDelta: number, elementDelta: number] | undefined> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowDown: [0, -1],
    ArrowUp: [0, 1]
};

function targetFor(node: HTMLElement, bars: Map<string, LayoutBar>): ElementTarget | null {
    const barElement = node.closest<HTMLElement>("[data-bar]");
    const layoutBar = barElement ? bars.get(barElement.dataset.bar ?? "") : undefined;
    if (!layoutBar) {
        return null;
    }
    const key = node.dataset.el;
    const layoutNode = layoutBar.nodes.find(candidate => candidate.key === key);
    if (!layoutNode) {
        return null;
    }
    return {
        element: layoutNode.element,
        node: layoutNode,
        bar: layoutBar.bar,
        layoutBar,
        rect: toRect(node.getBoundingClientRect())
    };
}

export function toRect(box: DOMRect): Rect {
    return { x: box.left, y: box.top, width: box.width, height: box.height };
}
