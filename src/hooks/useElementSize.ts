import { useEffect, useState } from "react";

export interface Size {
    width: number;
    height: number;
}

/**
 * Tracks an element's content box.
 *
 * Takes the element rather than a ref, because a ref object's identity never
 * changes: an effect keyed on one cannot tell that the element it wanted has
 * finally mounted. The chart renders a skeleton before its data arrives, so
 * that is not a corner case, it is the normal path.
 *
 * Reads come from ResizeObserver rather than from measuring during render, so
 * the chart never forces a synchronous layout while React is committing.
 */
export function useElementSize(element: Element | null): Size {
    const [size, setSize] = useState<Size>({ width: 0, height: 0 });

    useEffect(() => {
        if (!element) {
            return;
        }

        const apply = (width: number, height: number): void =>
            setSize(previous =>
                // Sub-pixel jitter would otherwise re-render the whole chart.
                Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5
                    ? previous
                    : { width, height }
            );

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            const box = entry.contentRect;
            apply(box.width, box.height);
        });

        observer.observe(element);
        const initial = element.getBoundingClientRect();
        apply(initial.width, initial.height);

        return () => observer.disconnect();
    }, [element]);

    return size;
}
