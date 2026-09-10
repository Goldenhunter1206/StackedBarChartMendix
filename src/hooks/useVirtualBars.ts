import { useEffect, useMemo, useState } from "react";

export interface VirtualRange {
    start: number;
    end: number;
}

/**
 * Windows the bar list to what is actually on screen.
 *
 * Bars are evenly pitched, so the visible range is arithmetic rather than a
 * search, and no bar has to be measured. Scroll updates are coalesced into an
 * animation frame: a fast flick fires scroll events far more often than the
 * browser paints, and re-rendering per event is wasted work.
 */
export function useVirtualBars(
    scrollElement: HTMLElement | null,
    barCount: number,
    pitch: number,
    viewportWidth: number,
    overscan: number
): VirtualRange {
    const [scrollLeft, setScrollLeft] = useState(0);

    useEffect(() => {
        const element = scrollElement;
        if (!element) {
            return;
        }

        let frame = 0;
        const onScroll = (): void => {
            if (frame !== 0) {
                return;
            }
            frame = requestAnimationFrame(() => {
                frame = 0;
                setScrollLeft(element.scrollLeft);
            });
        };

        element.addEventListener("scroll", onScroll, { passive: true });
        // Pick up a container that mounts already scrolled, through the same
        // coalescing path as a real scroll rather than setting state straight
        // from the effect body.
        onScroll();

        return () => {
            element.removeEventListener("scroll", onScroll);
            if (frame !== 0) {
                cancelAnimationFrame(frame);
            }
        };
    }, [scrollElement]);

    return useMemo(() => {
        if (barCount === 0 || pitch <= 0 || viewportWidth <= 0) {
            // Before the first measurement, render a small slice rather than
            // nothing, so the chart has content on its very first paint.
            return { start: 0, end: Math.min(barCount, 40) };
        }
        const first = Math.floor(scrollLeft / pitch) - overscan;
        const last = Math.ceil((scrollLeft + viewportWidth) / pitch) + overscan;
        return {
            start: Math.max(0, first),
            end: Math.min(barCount, Math.max(0, last))
        };
    }, [barCount, pitch, viewportWidth, scrollLeft, overscan]);
}
