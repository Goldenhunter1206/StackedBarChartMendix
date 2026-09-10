import { RefObject, useEffect, useState } from "react";

export interface Size {
    width: number;
    height: number;
}

/**
 * Tracks an element's content box.
 *
 * Reads come from ResizeObserver rather than from measuring during render, so
 * the chart never forces a synchronous layout while React is committing.
 */
export function useElementSize(ref: RefObject<Element>): Size {
    const [size, setSize] = useState<Size>({ width: 0, height: 0 });

    useEffect(() => {
        const element = ref.current;
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
    }, [ref]);

    return size;
}
