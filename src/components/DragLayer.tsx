import { ReactElement } from "react";
import { createPortal } from "react-dom";

import { DragState } from "../hooks/useDragAndDrop";

export interface DragLayerProps {
    drag: DragState;
    label: string;
}

/**
 * The floating drag ghost.
 *
 * Portalled and pointer-transparent so it never becomes its own drop target,
 * and positioned with a transform so following the cursor costs no layout.
 */
export function DragLayer({ drag, label }: DragLayerProps): ReactElement {
    return createPortal(
        <div
            className="sbc-ghost"
            style={{
                transform: `translate3d(${drag.pointerX + 12}px, ${drag.pointerY - 14}px, 0)`,
                background: drag.color,
                minHeight: `${Math.max(20, Math.min(drag.height, 48))}px`,
                width: `${Math.max(72, drag.width)}px`
            }}
            aria-hidden="true"
        >
            <span className="sbc-ghost-label">{label}</span>
        </div>,
        document.body
    );
}
