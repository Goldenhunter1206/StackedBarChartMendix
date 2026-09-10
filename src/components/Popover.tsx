import { ReactElement, ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Placement, Position, positionFloating, Rect } from "../utils/positioning";

export interface PopoverProps {
    /** Viewport-relative rectangle to attach to. */
    anchor: Rect;
    placement: Placement;
    offset?: number;
    className?: string;
    role?: string;
    ariaLabel?: string;
    /** Tooltips must not swallow pointer events; menus must. */
    interactive?: boolean;
    children: ReactNode;
}

/**
 * A floating panel rendered into document.body.
 *
 * Portalling matters here: Mendix layouts routinely clip their children with
 * `overflow`, and a tooltip or menu rendered inside the chart would be cut off
 * by the nearest scroll container.
 */
export function Popover(props: PopoverProps): ReactElement {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<Position | null>(null);

    const { anchor, placement, offset = 10 } = props;

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const box = element.getBoundingClientRect();
        setPosition(
            positionFloating(
                anchor,
                { width: box.width, height: box.height },
                { width: window.innerWidth, height: window.innerHeight },
                { placement, offset, padding: 8 }
            )
        );
    }, [anchor, placement, offset, props.children]);

    return createPortal(
        <div
            ref={ref}
            className={props.className}
            role={props.role}
            aria-label={props.ariaLabel}
            data-placement={position?.placement ?? placement}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                transform: `translate3d(${position?.x ?? 0}px, ${position?.y ?? 0}px, 0)`,
                // Hidden until measured, otherwise it flashes at the origin.
                visibility: position ? "visible" : "hidden",
                pointerEvents: props.interactive ? "auto" : "none",
                zIndex: 9999
            }}
        >
            {props.children}
        </div>,
        document.body
    );
}
